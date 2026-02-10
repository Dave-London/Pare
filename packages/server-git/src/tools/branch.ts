import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseBranch } from "../lib/parsers.js";
import { formatBranch } from "../lib/formatters.js";
import { GitBranchSchema } from "../schemas/index.js";

export function registerBranchTool(server: McpServer) {
  server.registerTool(
    "branch",
    {
      title: "Git Branch",
      description:
        "Lists, creates, or deletes branches. Returns structured branch data. Use instead of running `git branch` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
        create: z.string().optional().describe("Create a new branch with this name"),
        delete: z.string().optional().describe("Delete branch with this name"),
        all: z.boolean().optional().default(false).describe("Include remote branches"),
      },
      outputSchema: GitBranchSchema,
    },
    async ({ path, create, delete: deleteBranch, all }) => {
      const cwd = path || process.cwd();

      // Create branch
      if (create) {
        assertNoFlagInjection(create, "branch name");
        const result = await git(["checkout", "-b", create], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to create branch: ${result.stderr}`);
        }
      }

      // Delete branch
      if (deleteBranch) {
        assertNoFlagInjection(deleteBranch, "branch name");
        const result = await git(["branch", "-d", deleteBranch], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to delete branch: ${result.stderr}`);
        }
      }

      // List branches
      const args = ["branch"];
      if (all) args.push("-a");
      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git branch failed: ${result.stderr}`);
      }

      const branches = parseBranch(result.stdout);
      return dualOutput(branches, formatBranch);
    },
  );
}
