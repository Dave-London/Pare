import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  dualOutput,
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
} from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseWorktreeList, parseWorktreeResult } from "../lib/parsers.js";
import {
  formatWorktreeList,
  compactWorktreeListMap,
  formatWorktreeListCompact,
  formatWorktree,
} from "../lib/formatters.js";
import { GitWorktreeListSchema, GitWorktreeSchema } from "../schemas/index.js";

export function registerWorktreeTool(server: McpServer) {
  server.registerTool(
    "worktree",
    {
      title: "Git Worktree",
      description:
        "Lists, adds, or removes git worktrees for managing multiple working trees. Returns structured data with worktree paths, branches, and HEAD commits. Use instead of running `git worktree` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["list", "add", "remove"])
          .optional()
          .default("list")
          .describe("Worktree action to perform (default: list)"),
        worktreePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path for the new or existing worktree (required for add/remove)"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: z.union([GitWorktreeListSchema, GitWorktreeSchema]),
    },
    async (params) => {
      const cwd = params.path || process.cwd();
      const action = params.action || "list";

      if (action === "list") {
        const result = await git(["worktree", "list", "--porcelain"], cwd);

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

        if (params.createBranch && params.branch) {
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
      return dualOutput(worktreeResult, formatWorktree);
    },
  );
}
