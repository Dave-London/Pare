import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseMerge, parseMergeAbort } from "../lib/parsers.js";
import { formatMerge } from "../lib/formatters.js";
import { GitMergeSchema } from "../schemas/index.js";

/** Registers the `merge` tool on the given MCP server. */
export function registerMergeTool(server: McpServer) {
  server.registerTool(
    "merge",
    {
      title: "Git Merge",
      description:
        "Merges a branch into the current branch. Supports abort, continue, and quit actions. Returns structured data with merge status, fast-forward detection, conflicts, and commit hash. Use instead of running `git merge` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        branch: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Branch to merge"),
        noFf: z.boolean().optional().default(false).describe("Force merge commit (--no-ff)"),
        abort: z.boolean().optional().default(false).describe("Abort in-progress merge (--abort)"),
        continue: z
          .boolean()
          .optional()
          .default(false)
          .describe("Continue after conflict resolution (--continue)"),
        quit: z
          .boolean()
          .optional()
          .default(false)
          .describe("Quit merge without reverting (--quit)"),
        message: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Custom merge commit message"),
        strategy: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Merge strategy (--strategy), e.g. recursive, ort, resolve"),
        strategyOption: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Strategy-specific option (-X), e.g. theirs, ours, patience"),
        ffOnly: z.boolean().optional().describe("Only fast-forward merges (--ff-only)"),
        squash: z.boolean().optional().describe("Squash merge (--squash)"),
        noCommit: z.boolean().optional().describe("Merge without auto-committing (--no-commit)"),
        allowUnrelatedHistories: z
          .boolean()
          .optional()
          .describe("Allow merging unrelated histories (--allow-unrelated-histories)"),
        signoff: z.boolean().optional().describe("Add Signed-off-by trailer (--signoff)"),
        autostash: z.boolean().optional().describe("Stash/unstash around merge (--autostash)"),
        noVerify: z.boolean().optional().describe("Bypass pre-merge hooks (--no-verify)"),
      },
      outputSchema: GitMergeSchema,
    },
    async ({
      path,
      branch,
      noFf,
      abort,
      continue: cont,
      quit,
      message,
      strategy,
      strategyOption,
      ffOnly,
      squash,
      noCommit,
      allowUnrelatedHistories,
      signoff,
      autostash,
      noVerify,
    }) => {
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

      // Handle --continue
      if (cont) {
        const result = await git(["merge", "--continue"], cwd);
        const mergeResult = parseMerge(result.stdout, result.stderr, branch);
        if (result.exitCode !== 0 && mergeResult.merged) {
          throw new Error(`git merge --continue failed: ${result.stderr}`);
        }
        return dualOutput(mergeResult, formatMerge);
      }

      // Handle --quit
      if (quit) {
        const result = await git(["merge", "--quit"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git merge --quit failed: ${result.stderr}`);
        }
        const mergeResult = parseMergeAbort(result.stdout, result.stderr);
        return dualOutput(mergeResult, formatMerge);
      }

      assertNoFlagInjection(branch, "branch");
      if (message) {
        assertNoFlagInjection(message, "message");
      }
      if (strategy) assertNoFlagInjection(strategy, "strategy");
      if (strategyOption) assertNoFlagInjection(strategyOption, "strategyOption");

      const mergeBaseResult = await git(["merge-base", "HEAD", branch], cwd);
      const mergeBase = mergeBaseResult.exitCode === 0 ? mergeBaseResult.stdout.trim() : undefined;

      // Build merge args
      const args = ["merge"];
      if (noFf) args.push("--no-ff");
      if (ffOnly) args.push("--ff-only");
      if (squash) args.push("--squash");
      if (noCommit) args.push("--no-commit");
      if (allowUnrelatedHistories) args.push("--allow-unrelated-histories");
      if (signoff) args.push("--signoff");
      if (autostash) args.push("--autostash");
      if (noVerify) args.push("--no-verify");
      if (strategy) args.push(`--strategy=${strategy}`);
      if (strategyOption) args.push(`-X${strategyOption}`);
      if (message) args.push("-m", message);
      args.push(branch);

      const result = await git(args, cwd);

      const mergeResult = parseMerge(result.stdout, result.stderr, branch, mergeBase);
      if (result.exitCode !== 0 && mergeResult.merged) {
        throw new Error(`git merge failed: ${result.stderr}`);
      }
      return dualOutput(mergeResult, formatMerge);
    },
  );
}
