import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseBranch } from "../lib/parsers.js";
import { formatBranch, compactBranchMap, formatBranchCompact } from "../lib/formatters.js";
import { GitBranchSchema } from "../schemas/index.js";

/** Registers the `branch` tool on the given MCP server. */
export function registerBranchTool(server: McpServer) {
  server.registerTool(
    "branch",
    {
      title: "Git Branch",
      description:
        "Lists, creates, renames, or deletes branches. Returns structured branch data. Use instead of running `git branch` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        create: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Create a new branch with this name"),
        startPoint: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Start point for branch creation (commit, tag, or branch)"),
        delete: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Delete branch with this name"),
        rename: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("New name when renaming the current branch (-m/-M)"),
        setUpstream: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set tracking branch (-u/--set-upstream-to)"),
        sort: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Sort branch list (--sort), e.g. -committerdate, authordate"),
        contains: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter branches containing a commit (--contains)"),
        pattern: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter branches matching a pattern (<pattern>)"),
        all: z.boolean().optional().default(false).describe("Include remote branches"),
        forceDelete: z.boolean().optional().describe("Force-delete unmerged branches (-D)"),
        merged: z.boolean().optional().describe("Filter to branches merged into HEAD (--merged)"),
        noMerged: z
          .boolean()
          .optional()
          .describe("Filter to branches not merged into HEAD (--no-merged)"),
        remotes: z.boolean().optional().describe("List remote branches only (-r)"),
        verbose: z.boolean().optional().describe("Verbose branch listing (-v)"),
        force: z.boolean().optional().describe("Force branch creation even if it exists (-f)"),
        switchAfterCreate: z
          .boolean()
          .optional()
          .default(false)
          .describe("Switch to the created branch after creation (uses git switch)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitBranchSchema,
    },
    async ({
      path,
      create,
      startPoint,
      delete: deleteBranch,
      rename,
      setUpstream,
      sort,
      contains,
      pattern,
      all,
      forceDelete,
      merged,
      noMerged,
      remotes,
      verbose,
      force,
      switchAfterCreate,
      compact,
    }) => {
      const cwd = path || process.cwd();

      // Rename branch
      if (rename) {
        assertNoFlagInjection(rename, "branch name");
        const renameFlag = force ? "-M" : "-m";
        const result = await git(["branch", renameFlag, rename], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to rename branch: ${result.stderr}`);
        }
      }

      // Set upstream
      if (setUpstream) {
        assertNoFlagInjection(setUpstream, "upstream");
        const result = await git(["branch", `--set-upstream-to=${setUpstream}`], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to set upstream: ${result.stderr}`);
        }
      }

      // Create branch
      if (create) {
        assertNoFlagInjection(create, "branch name");
        if (startPoint) assertNoFlagInjection(startPoint, "start point");
        const createArgs = ["branch"];
        if (force) createArgs.push("-f");
        createArgs.push(create);
        if (startPoint) createArgs.push(startPoint);
        const result = await git(createArgs, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to create branch: ${result.stderr}`);
        }

        // Keep create and switch as separate operations; switch only when explicitly requested.
        if (switchAfterCreate) {
          const switchResult = await git(["switch", create], cwd);
          if (switchResult.exitCode !== 0) {
            throw new Error(`Branch created but failed to switch: ${switchResult.stderr}`);
          }
        }
      }

      // Delete branch
      if (deleteBranch) {
        assertNoFlagInjection(deleteBranch, "branch name");
        const deleteFlag = forceDelete ? "-D" : "-d";
        const result = await git(["branch", deleteFlag, deleteBranch], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to delete branch: ${result.stderr}`);
        }
      }

      // List branches — always use -vv to get upstream tracking info
      const args = ["branch", "-vv"];
      if (all) args.push("-a");
      if (remotes) args.push("-r");
      if (merged) args.push("--merged");
      if (noMerged) args.push("--no-merged");
      if (verbose) args.push("-v");
      if (sort) {
        assertNoFlagInjection(sort, "sort");
        args.push(`--sort=${sort}`);
      }
      if (contains) {
        assertNoFlagInjection(contains, "contains");
        args.push(`--contains=${contains}`);
      }
      if (pattern) {
        assertNoFlagInjection(pattern, "pattern");
        args.push(pattern);
      }
      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git branch failed: ${result.stderr}`);
      }

      const branches = parseBranch(result.stdout);
      return compactDualOutput(
        branches,
        result.stdout,
        formatBranch,
        compactBranchMap,
        formatBranchCompact,
        compact === false,
      );
    },
  );
}
