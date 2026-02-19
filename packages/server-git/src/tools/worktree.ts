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
import { parseWorktreeList, parseWorktreeResult } from "../lib/parsers.js";
import {
  formatWorktreeList,
  compactWorktreeListMap,
  formatWorktreeListCompact,
  formatWorktree,
} from "../lib/formatters.js";
import { GitWorktreeOutputSchema } from "../schemas/index.js";

/** Registers the `worktree` tool on the given MCP server. */
export function registerWorktreeTool(server: McpServer) {
  server.registerTool(
    "worktree",
    {
      title: "Git Worktree",
      description:
        "Lists, adds, removes, locks, unlocks, or prunes git worktrees for managing multiple working trees. Returns structured data with worktree paths, branches, and HEAD commits.",
      inputSchema: {
        path: repoPathInput,
        action: z
          .enum(["list", "add", "remove", "lock", "unlock", "prune", "move", "repair"])
          .optional()
          .default("list")
          .describe("Worktree action to perform (default: list)"),
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
          .describe("Base ref for the new branch (used with add + createBranch)"),
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
          .describe("Verbose list output showing locked/prunable details (-v on list)"),
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
        const listArgs = ["worktree", "list", "--porcelain"];
        if (params.listVerbose) listArgs.push("-v");
        const result = await git(listArgs, cwd);

        if (result.exitCode !== 0) {
          throw new Error(`git worktree list failed: ${result.stderr}`);
        }

        const worktreeList = parseWorktreeList(result.stdout);
        return compactDualOutput(
          worktreeList,
          result.stdout,
          formatWorktreeList,
          compactWorktreeListMap,
          formatWorktreeListCompact,
          params.compact === false,
        );
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
