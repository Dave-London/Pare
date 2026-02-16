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
        "Lists, creates, or deletes branches. Returns structured branch data. Use instead of running `git branch` in the terminal.",
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
        delete: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Delete branch with this name"),
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
      delete: deleteBranch,
      all,
      forceDelete,
      merged,
      noMerged,
      remotes,
      verbose,
      force,
      compact,
    }) => {
      const cwd = path || process.cwd();

      // Create branch
      if (create) {
        assertNoFlagInjection(create, "branch name");
        const createArgs = ["checkout"];
        if (force) {
          createArgs.push("-B");
        } else {
          createArgs.push("-b");
        }
        createArgs.push(create);
        const result = await git(createArgs, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to create branch: ${result.stderr}`);
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

      // List branches
      const args = ["branch"];
      if (all) args.push("-a");
      if (remotes) args.push("-r");
      if (merged) args.push("--merged");
      if (noMerged) args.push("--no-merged");
      if (verbose) args.push("-v");
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
