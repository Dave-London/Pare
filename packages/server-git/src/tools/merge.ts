import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseMerge, parseMergeAbort } from "../lib/parsers.js";
import { formatMerge } from "../lib/formatters.js";
import { GitMergeSchema } from "../schemas/index.js";

export function registerMergeTool(server: McpServer) {
  server.registerTool(
    "merge",
    {
      title: "Git Merge",
      description:
        "Merges a branch into the current branch. Returns structured data with merge status, fast-forward detection, conflicts, and commit hash.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
        branch: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Branch to merge"),
        noFf: z.boolean().optional().default(false).describe("Force merge commit (--no-ff)"),
        abort: z.boolean().optional().default(false).describe("Abort in-progress merge (--abort)"),
        message: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Custom merge commit message"),
      },
      outputSchema: GitMergeSchema,
    },
    async ({ path, branch, noFf, abort, message }) => {
      const cwd = path || process.cwd();

      // Handle --abort
      if (abort) {
        const result = await git(["merge", "--abort"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git merge --abort failed: ${result.stderr}`);
        }
        const mergeResult = parseMergeAbort(result.stdout, result.stderr);
        return dualOutput(mergeResult, formatMerge);
      }

      assertNoFlagInjection(branch, "branch");
      if (message) {
        assertNoFlagInjection(message, "message");
      }

      // Build merge args
      const args = ["merge"];
      if (noFf) args.push("--no-ff");
      if (message) args.push("-m", message);
      args.push(branch);

      const result = await git(args, cwd);

      // Merge can exit non-zero for conflicts but still produce useful output
      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        if (/CONFLICT/.test(combined)) {
          const mergeResult = parseMerge(result.stdout, result.stderr, branch);
          return dualOutput(mergeResult, formatMerge);
        }
        throw new Error(`git merge failed: ${result.stderr}`);
      }

      const mergeResult = parseMerge(result.stdout, result.stderr, branch);
      return dualOutput(mergeResult, formatMerge);
    },
  );
}
