import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  dualOutput,
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  repoPathInput,
} from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import {
  parseWorktreeList,
  parseWorktreeResult,
  parseRevListCount,
  decidePruneMerged,
  worktreePathsEqual,
} from "../lib/parsers.js";
import {
  formatWorktreeList,
  compactWorktreeListMap,
  formatWorktreeListCompact,
  formatWorktree,
  formatWorktreePrune,
} from "../lib/formatters.js";
import type { GitWorktreeListFull } from "../schemas/index.js";
import { GitWorktreeOutputSchema } from "../schemas/index.js";

type WorktreeEntry = GitWorktreeListFull["worktrees"][number];

/**
 * Enriches a single worktree entry with per-worktree status (#921):
 *   - dirty:    `git status --porcelain` in the worktree is non-empty
 *   - ahead/behind: `git rev-list --left-right --count @{u}...HEAD` (upstream vs HEAD).
 *     Omitted when the worktree has no upstream (rev-list exits non-zero).
 *   - unpushed: commits on HEAD not reachable from any remote-tracking branch
 *   - merged:   worktree HEAD is an ancestor of `mergedInto`
 * Bare worktrees have no working tree, so status/ahead fields are skipped for them.
 */
async function enrichWorktreeStatus(
  wt: WorktreeEntry,
  cwd: string,
  opts: { withStatus: boolean; mergedInto?: string },
): Promise<void> {
  if (opts.mergedInto && wt.head) {
    const anc = await git(["merge-base", "--is-ancestor", wt.head, opts.mergedInto], cwd);
    // exit 0 = ancestor (merged), 1 = not, other = error (leave undefined).
    if (anc.exitCode === 0) wt.merged = true;
    else if (anc.exitCode === 1) wt.merged = false;
  }

  if (!opts.withStatus || wt.bare) return;

  const status = await git(["status", "--porcelain"], wt.path);
  if (status.exitCode === 0) wt.dirty = status.stdout.trim().length > 0;

  // ahead/behind relative to the tracked upstream; @{u} fails without one.
  const ab = await git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], wt.path);
  if (ab.exitCode === 0) {
    const nums = ab.stdout.trim().split(/\s+/);
    if (nums.length === 2) {
      wt.behind = parseRevListCount(nums[0]);
      wt.ahead = parseRevListCount(nums[1]);
    }
  }

  // Commits reachable from HEAD but not from any remote — true "at risk" count.
  const unpushed = await git(["rev-list", "--count", "HEAD", "--not", "--remotes"], wt.path);
  if (unpushed.exitCode === 0) wt.unpushed = parseRevListCount(unpushed.stdout);
}

/** Registers the `worktree` tool on the given MCP server. */
export function registerWorktreeTool(server: McpServer) {
  server.registerTool(
    "worktree",
    {
      title: "Git Worktree",
      description:
        "Lists, adds, removes, locks, unlocks, or prunes git worktrees for managing multiple working trees. Returns structured data with worktree paths, branches, and HEAD commits. On list, pass withStatus for per-worktree {dirty, ahead, behind, unpushed} and/or mergedInto for a per-worktree merged flag. Use action=prune-merged {base, requireClean} for safe batch cleanup.",
      annotations: { readOnlyHint: false },
      inputSchema: {
        path: repoPathInput,
        action: z
          .enum([
            "list",
            "add",
            "remove",
            "lock",
            "unlock",
            "prune",
            "move",
            "repair",
            "prune-merged",
          ])
          .optional()
          .default("list")
          .describe(
            "Worktree action to perform (default: list). 'prune-merged' safely batch-removes worktrees whose HEAD is merged into `base`.",
          ),
        worktreePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path for the new or existing worktree (required for add/remove/lock/unlock)"),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch to checkout in the new worktree (used with add action)"),
        createBranch: z
          .boolean()
          .optional()
          .default(false)
          .describe("Create a new branch when adding a worktree (used with add action)"),
        base: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Base ref. With add+createBranch: the new branch's start point. With action=prune-merged: the ref a worktree must be merged into to be eligible for removal (required).",
          ),
        withStatus: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "On list: enrich each worktree with { dirty, ahead, behind, unpushed }. Off by default to keep output lean.",
          ),
        mergedInto: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "On list: add `merged` per worktree (is its HEAD an ancestor of this ref). Useful alongside withStatus for safe cleanup triage.",
          ),
        requireClean: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "For action=prune-merged: only remove worktrees that are clean (no uncommitted changes). Default true. When false, dirty merged worktrees are force-removed.",
          ),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe("Force removal even if worktree is dirty (used with remove action)"),
        forceAdd: z
          .boolean()
          .optional()
          .describe("Allow checking out already-checked-out branch on add (-f)"),
        detach: z.boolean().optional().describe("Detach HEAD on add (-d/--detach)"),
        noCheckout: z.boolean().optional().describe("Skip checkout on add (--no-checkout)"),
        forceBranch: z.boolean().optional().describe("Create/reset branch on add (-B)"),
        guessRemote: z
          .boolean()
          .optional()
          .describe("Auto-detect remote tracking on add (--guess-remote)"),
        listVerbose: z
          .boolean()
          .optional()
          .describe(
            "Include locked/prunable details on list. Always surfaced via the porcelain parser; this flag is accepted for compatibility and never passes git's -v (which conflicts with --porcelain).",
          ),
        reason: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Reason for locking the worktree (--reason, used with lock)"),
        newPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Target path for worktree move (used with action=move)"),
        repairPaths: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Optional worktree paths to repair (used with action=repair)"),
        compact: compactInput,
      },
      outputSchema: GitWorktreeOutputSchema,
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const action = params.action || "list";

      if (action === "list") {
        // `--porcelain` already emits the `locked <reason>` and `prunable <reason>`
        // attribute lines that `-v/--verbose` surfaces in the human format, and git
        // rejects `--verbose` alongside `--porcelain` (they are mutually exclusive).
        // So we never pass `-v` here — `listVerbose` is honored by the porcelain parser,
        // which captures the locked/prunable detail into the structured output. See #906.
        const listArgs = ["worktree", "list", "--porcelain"];
        const result = await git(listArgs, cwd);

        if (result.exitCode !== 0) {
          throw new Error(`git worktree list failed: ${result.stderr}`);
        }

        const worktreeList = parseWorktreeList(result.stdout);

        // Opt-in per-worktree enrichment (#921). Keeps default output unchanged.
        const withStatus = params.withStatus === true;
        const mergedInto = params.mergedInto;
        if (mergedInto) assertNoFlagInjection(mergedInto, "mergedInto");
        if (withStatus || mergedInto) {
          await Promise.all(
            worktreeList.worktrees.map((wt) =>
              enrichWorktreeStatus(wt, cwd, { withStatus, mergedInto }),
            ),
          );
        }

        return compactDualOutput(
          worktreeList,
          result.stdout,
          formatWorktreeList,
          compactWorktreeListMap,
          formatWorktreeListCompact,
          // Force full schema when enriched so status/merged fields survive compaction.
          params.compact === false || withStatus || !!mergedInto,
        );
      }

      if (action === "prune-merged") {
        const baseRef = params.base;
        if (!baseRef) {
          throw new Error("'base' is required for worktree prune-merged");
        }
        assertNoFlagInjection(baseRef, "base");
        // requireClean defaults to true (safety); only an explicit false opts out.
        const requireClean = params.requireClean !== false;

        const listResult = await git(["worktree", "list", "--porcelain"], cwd);
        if (listResult.exitCode !== 0) {
          throw new Error(`git worktree list failed: ${listResult.stderr}`);
        }
        const { worktrees } = parseWorktreeList(listResult.stdout);

        // The first porcelain entry is always the main worktree; the current
        // worktree is the one containing cwd. Both are protected from removal.
        const mainPath = worktrees[0]?.path ?? "";
        const top = await git(["rev-parse", "--show-toplevel"], cwd);
        const currentPath = top.exitCode === 0 ? top.stdout.trim() : cwd;

        // Annotate merged + dirty only for real removal candidates. Protected
        // worktrees (bare/main/current/locked) are short-circuited by
        // decidePruneMerged, so we skip their git calls entirely.
        await Promise.all(
          worktrees.map(async (wt) => {
            if (
              wt.bare ||
              wt.locked ||
              worktreePathsEqual(wt.path, mainPath) ||
              worktreePathsEqual(wt.path, currentPath)
            ) {
              return;
            }
            const anc = await git(["merge-base", "--is-ancestor", wt.head, baseRef], cwd);
            wt.merged = anc.exitCode === 0;
            if (requireClean) {
              const st = await git(["status", "--porcelain"], wt.path);
              // Treat an unreadable worktree as dirty (fail safe).
              wt.dirty = st.exitCode === 0 ? st.stdout.trim().length > 0 : true;
            }
          }),
        );

        const decisions = decidePruneMerged(worktrees, { mainPath, currentPath, requireClean });

        // Execute removals for the entries cleared by the decision function.
        for (const decision of decisions) {
          if (!decision.removed) continue;
          const rmArgs = ["worktree", "remove"];
          // Only opting out of the clean guard uses --force (dirty merged trees).
          if (!requireClean) rmArgs.push("--force");
          rmArgs.push(decision.path);
          const rm = await git(rmArgs, cwd);
          if (rm.exitCode !== 0) {
            decision.removed = false;
            decision.reason = "remove-failed";
          }
        }

        const output = {
          success: true,
          action: "prune-merged" as const,
          base: baseRef,
          results: decisions,
        };
        return dualOutput(output, formatWorktreePrune);
      }

      if (action === "add") {
        const worktreePath = params.worktreePath;
        if (!worktreePath) {
          throw new Error("'worktreePath' is required for worktree add");
        }

        assertNoFlagInjection(worktreePath, "worktreePath");

        const args = ["worktree", "add"];

        if (params.forceAdd) args.push("-f");
        if (params.detach) args.push("--detach");
        if (params.noCheckout) args.push("--no-checkout");
        if (params.guessRemote) args.push("--guess-remote");

        if (params.forceBranch && params.branch) {
          assertNoFlagInjection(params.branch, "branch");
          args.push("-B", params.branch);
        } else if (params.createBranch && params.branch) {
          assertNoFlagInjection(params.branch, "branch");
          args.push("-b", params.branch);
        }

        args.push(worktreePath);

        if (!params.createBranch && params.branch) {
          assertNoFlagInjection(params.branch, "branch");
          args.push(params.branch);
        }

        if (params.base) {
          assertNoFlagInjection(params.base, "base");
          args.push(params.base);
        }

        const result = await git(args, cwd);

        if (result.exitCode !== 0) {
          throw new Error(`git worktree add failed: ${result.stderr}`);
        }

        const branch = params.branch || "";
        const worktreeResult = parseWorktreeResult(
          result.stdout,
          result.stderr,
          worktreePath,
          branch,
        );
        worktreeResult.action = "add";
        return dualOutput(worktreeResult, formatWorktree);
      }

      if (action === "lock") {
        const worktreePath = params.worktreePath;
        if (!worktreePath) {
          throw new Error("'worktreePath' is required for worktree lock");
        }
        assertNoFlagInjection(worktreePath, "worktreePath");

        const args = ["worktree", "lock"];
        if (params.reason) {
          assertNoFlagInjection(params.reason, "reason");
          args.push(`--reason=${params.reason}`);
        }
        args.push(worktreePath);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git worktree lock failed: ${result.stderr}`);
        }

        const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, worktreePath, "");
        worktreeResult.action = "lock";
        return dualOutput(worktreeResult, formatWorktree);
      }

      if (action === "unlock") {
        const worktreePath = params.worktreePath;
        if (!worktreePath) {
          throw new Error("'worktreePath' is required for worktree unlock");
        }
        assertNoFlagInjection(worktreePath, "worktreePath");

        const result = await git(["worktree", "unlock", worktreePath], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git worktree unlock failed: ${result.stderr}`);
        }

        const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, worktreePath, "");
        worktreeResult.action = "unlock";
        return dualOutput(worktreeResult, formatWorktree);
      }

      if (action === "prune") {
        const args = ["worktree", "prune"];
        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git worktree prune failed: ${result.stderr}`);
        }

        const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, "", "");
        worktreeResult.action = "prune";
        return dualOutput(worktreeResult, formatWorktree);
      }

      if (action === "move") {
        const worktreePath = params.worktreePath;
        const newPath = params.newPath;
        if (!worktreePath || !newPath) {
          throw new Error("'worktreePath' and 'newPath' are required for worktree move");
        }
        assertNoFlagInjection(worktreePath, "worktreePath");
        assertNoFlagInjection(newPath, "newPath");
        const result = await git(["worktree", "move", worktreePath, newPath], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git worktree move failed: ${result.stderr}`);
        }
        const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, newPath, "");
        worktreeResult.action = "move";
        worktreeResult.targetPath = newPath;
        return dualOutput(worktreeResult, formatWorktree);
      }

      if (action === "repair") {
        const args = ["worktree", "repair"];
        if (params.repairPaths && params.repairPaths.length > 0) {
          for (const p of params.repairPaths) {
            assertNoFlagInjection(p, "repairPaths");
          }
          args.push(...params.repairPaths);
        }
        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git worktree repair failed: ${result.stderr}`);
        }
        const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, "", "");
        worktreeResult.action = "repair";
        return dualOutput(worktreeResult, formatWorktree);
      }

      // remove
      const worktreePath = params.worktreePath;
      if (!worktreePath) {
        throw new Error("'worktreePath' is required for worktree remove");
      }

      assertNoFlagInjection(worktreePath, "worktreePath");

      const args = ["worktree", "remove"];
      if (params.force) {
        args.push("--force");
      }
      args.push(worktreePath);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git worktree remove failed: ${result.stderr}`);
      }

      const worktreeResult = parseWorktreeResult(result.stdout, result.stderr, worktreePath, "");
      worktreeResult.action = "remove";
      return dualOutput(worktreeResult, formatWorktree);
    },
  );
}
