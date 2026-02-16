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
        "Rebases the current branch onto a target branch. Supports abort, continue, skip, and quit for conflict resolution. Returns structured data with success status, branch info, conflicts, and rebased commit count. Use instead of running `git rebase` in the terminal.",
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
          .describe("Target branch to rebase onto (required unless abort/continue/skip/quit)"),
        onto: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Rebase onto a different base (--onto)"),
        abort: z.boolean().optional().default(false).describe("Abort in-progress rebase"),
        continue: z
          .boolean()
          .optional()
          .default(false)
          .describe("Continue after conflict resolution"),
        skip: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip current commit during rebase (--skip)"),
        quit: z
          .boolean()
          .optional()
          .default(false)
          .describe("Quit rebase without reverting (--quit)"),
        strategy: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Merge strategy (--strategy), e.g. recursive, ort"),
        strategyOption: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Strategy-specific option (-X), e.g. theirs, ours"),
        exec: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Run command after each commit (--exec)"),
        empty: z
          .enum(["drop", "keep", "ask"])
          .optional()
          .describe("Control empty commit handling (--empty)"),
        autostash: z.boolean().optional().describe("Stash/unstash around rebase (--autostash)"),
        autosquash: z
          .boolean()
          .optional()
          .describe("Auto-apply fixup/squash commits (--autosquash)"),
        forceRebase: z
          .boolean()
          .optional()
          .describe("Force rebase even if up-to-date (--force-rebase)"),
        rebaseMerges: z.boolean().optional().describe("Preserve merge commits (--rebase-merges)"),
        updateRefs: z.boolean().optional().describe("Update dependent branches (--update-refs)"),
        signoff: z.boolean().optional().describe("Add Signed-off-by trailer (--signoff)"),
      },
      outputSchema: GitRebaseSchema,
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const branch = params.branch;
      const abort = params.abort;
      const cont = params.continue;
      const skip = params.skip;
      const quit = params.quit;

      // Set GIT_EDITOR=true to prevent editor launch in non-interactive mode
      const env = { GIT_EDITOR: "true" };

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

      // Handle skip
      if (skip) {
        const result = await git(["rebase", "--skip"], cwd);
        if (result.exitCode !== 0) {
          const combined = `${result.stdout}\n${result.stderr}`;
          if (/CONFLICT/.test(combined) || /could not apply/.test(combined)) {
            const rebaseResult = parseRebase(result.stdout, result.stderr, branch || "", current);
            return dualOutput(rebaseResult, formatRebase);
          }
          throw new Error(`git rebase --skip failed: ${result.stderr}`);
        }
        const rebaseResult = parseRebase(result.stdout, result.stderr, branch || "", current);
        return dualOutput(rebaseResult, formatRebase);
      }

      // Handle quit
      if (quit) {
        const result = await git(["rebase", "--quit"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git rebase --quit failed: ${result.stderr}`);
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
        throw new Error(
          "branch is required for rebase (unless using abort, continue, skip, or quit)",
        );
      }

      assertNoFlagInjection(branch, "branch");
      if (params.onto) assertNoFlagInjection(params.onto, "onto");
      if (params.strategy) assertNoFlagInjection(params.strategy, "strategy");
      if (params.strategyOption) assertNoFlagInjection(params.strategyOption, "strategyOption");
      if (params.exec) assertNoFlagInjection(params.exec, "exec");

      // Count commits that will be rebased using git log
      const logResult = await git(["log", "--oneline", `${branch}..HEAD`], cwd);
      const commitCount =
        logResult.exitCode === 0
          ? logResult.stdout.trim().split("\n").filter(Boolean).length
          : undefined;

      const args = ["rebase"];
      if (params.autostash) args.push("--autostash");
      if (params.autosquash) args.push("--autosquash");
      if (params.forceRebase) args.push("--force-rebase");
      if (params.rebaseMerges) args.push("--rebase-merges");
      if (params.updateRefs) args.push("--update-refs");
      if (params.signoff) args.push("--signoff");
      if (params.strategy) args.push(`--strategy=${params.strategy}`);
      if (params.strategyOption) args.push(`-X${params.strategyOption}`);
      if (params.exec) args.push(`--exec=${params.exec}`);
      if (params.empty) args.push(`--empty=${params.empty}`);
      if (params.onto) {
        args.push("--onto", params.onto);
      }
      args.push(branch);
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
