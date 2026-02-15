import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseRebase } from "../lib/parsers.js";
import { formatRebase } from "../lib/formatters.js";
import { GitRebaseSchema } from "../schemas/index.js";

/** Registers the `rebase` tool on the given MCP server. */
export function registerRebaseTool(server: McpServer) {
  server.registerTool(
    "rebase",
    {
      title: "Git Rebase",
      description:
        "Rebases the current branch onto a target branch. Supports abort and continue for conflict resolution. Returns structured data with success status, branch info, conflicts, and rebased commit count. Use instead of running `git rebase` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target branch to rebase onto (required unless abort/continue)"),
        abort: z.boolean().optional().default(false).describe("Abort in-progress rebase"),
        continue: z
          .boolean()
          .optional()
          .default(false)
          .describe("Continue after conflict resolution"),
      },
      outputSchema: GitRebaseSchema,
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const branch = params.branch;
      const abort = params.abort;
      const cont = params.continue;

      // Get current branch before rebase
      const currentResult = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
      const current = currentResult.exitCode === 0 ? currentResult.stdout.trim() : "unknown";

      // Handle abort
      if (abort) {
        const result = await git(["rebase", "--abort"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git rebase --abort failed: ${result.stderr}`);
        }
        const rebaseResult = parseRebase(result.stdout, result.stderr, "", current);
        return dualOutput(rebaseResult, formatRebase);
      }

      // Handle continue
      if (cont) {
        const result = await git(["rebase", "--continue"], cwd);

        // Continue can fail if there are still conflicts
        if (result.exitCode !== 0) {
          const combined = `${result.stdout}\n${result.stderr}`;
          if (/CONFLICT/.test(combined) || /could not apply/.test(combined)) {
            const rebaseResult = parseRebase(result.stdout, result.stderr, branch || "", current);
            return dualOutput(rebaseResult, formatRebase);
          }
          throw new Error(`git rebase --continue failed: ${result.stderr}`);
        }

        const rebaseResult = parseRebase(result.stdout, result.stderr, branch || "", current);
        return dualOutput(rebaseResult, formatRebase);
      }

      // Normal rebase — branch is required
      if (!branch) {
        throw new Error("branch is required for rebase (unless using abort or continue)");
      }

      assertNoFlagInjection(branch, "branch");

      // Count commits that will be rebased using git log
      const logResult = await git(["log", "--oneline", `${branch}..HEAD`], cwd);
      const commitCount =
        logResult.exitCode === 0
          ? logResult.stdout.trim().split("\n").filter(Boolean).length
          : undefined;

      const args = ["rebase", branch];
      const result = await git(args, cwd);

      // Rebase can exit non-zero for conflicts — still produce useful output
      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        if (/CONFLICT/.test(combined)) {
          const rebaseResult = parseRebase(result.stdout, result.stderr, branch, current);
          // Override rebasedCommits with our pre-counted value
          if (commitCount !== undefined) {
            rebaseResult.rebasedCommits = commitCount;
          }
          return dualOutput(rebaseResult, formatRebase);
        }
        throw new Error(`git rebase failed: ${result.stderr}`);
      }

      const rebaseResult = parseRebase(result.stdout, result.stderr, branch, current);
      // Override rebasedCommits with our pre-counted value
      if (commitCount !== undefined) {
        rebaseResult.rebasedCommits = commitCount;
      }
      return dualOutput(rebaseResult, formatRebase);
    },
  );
}
