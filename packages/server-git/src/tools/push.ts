import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parsePush } from "../lib/parsers.js";
import { formatPush } from "../lib/formatters.js";
import { GitPushSchema } from "../schemas/index.js";

/** Registers the `push` tool on the given MCP server. */
export function registerPushTool(server: McpServer) {
  server.registerTool(
    "push",
    {
      title: "Git Push",
      description:
        "Pushes commits to a remote repository. Returns structured data with success status, remote, branch, and summary. Use instead of running `git push` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
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
          .describe("Branch to push (default: current branch)"),
        force: z.boolean().optional().default(false).describe("Force push (--force)"),
        setUpstream: z.boolean().optional().default(false).describe("Set upstream tracking (-u)"),
      },
      outputSchema: GitPushSchema,
    },
    async ({ path, remote, branch, force, setUpstream }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(remote, "remote");
      if (branch) {
        assertNoFlagInjection(branch, "branch");
      }

      const args = ["push"];
      if (force) args.push("--force");
      if (setUpstream) args.push("-u");
      args.push(remote);
      if (branch) args.push(branch);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git push failed: ${result.stderr}`);
      }

      const pushResult = parsePush(result.stdout, result.stderr, remote, branch || "");
      return dualOutput(pushResult, formatPush);
    },
  );
}
