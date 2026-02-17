import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parsePull } from "../lib/parsers.js";
import { formatPull } from "../lib/formatters.js";
import { GitPullSchema } from "../schemas/index.js";

export function registerPullTool(server: McpServer) {
  server.registerTool(
    "pull",
    {
      title: "Git Pull",
      description:
        "Pulls changes from a remote repository. Returns structured data with success status, summary, change statistics, and any conflicts.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
        remote: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("origin")
          .describe('Remote name (default: "origin")'),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch to pull (default: current tracking branch)"),
        rebase: z
          .boolean()
          .optional()
          .default(false)
          .describe("Use rebase instead of merge (--rebase)"),
      },
      outputSchema: GitPullSchema,
    },
    async ({ path, remote, branch, rebase }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(remote, "remote");
      if (branch) {
        assertNoFlagInjection(branch, "branch");
      }

      const args = ["pull"];
      if (rebase) args.push("--rebase");
      args.push(remote);
      if (branch) args.push(branch);

      const result = await git(args, cwd);

      // Pull can exit non-zero for conflicts but still produce useful output
      if (result.exitCode !== 0) {
        // Check if it's a conflict situation (still parseable)
        const combined = `${result.stdout}\n${result.stderr}`;
        if (/CONFLICT/.test(combined)) {
          const pullResult = parsePull(result.stdout, result.stderr);
          return dualOutput(pullResult, formatPull);
        }
        throw new Error(`git pull failed: ${result.stderr}`);
      }

      const pullResult = parsePull(result.stdout, result.stderr);
      return dualOutput(pullResult, formatPull);
    },
  );
}
