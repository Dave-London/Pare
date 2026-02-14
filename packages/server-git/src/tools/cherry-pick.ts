import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCherryPick } from "../lib/parsers.js";
import { formatCherryPick } from "../lib/formatters.js";
import { GitCherryPickSchema } from "../schemas/index.js";

export function registerCherryPickTool(server: McpServer) {
  server.registerTool(
    "cherry-pick",
    {
      title: "Git Cherry-Pick",
      description:
        "Applies specific commits to the current branch. Returns structured data with applied commits and any conflicts. Use instead of running `git cherry-pick` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        commits: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .default([])
          .describe("Commit hashes to cherry-pick"),
        abort: z.boolean().optional().default(false).describe("Abort in-progress cherry-pick"),
        continue: z
          .boolean()
          .optional()
          .default(false)
          .describe("Continue after resolving conflicts"),
        noCommit: z
          .boolean()
          .optional()
          .default(false)
          .describe("Apply changes without committing (-n)"),
      },
      outputSchema: GitCherryPickSchema,
    },
    async (input) => {
      const cwd = input.path || process.cwd();
      const commits = input.commits;
      const abort = input.abort;
      const cont = input.continue;
      const noCommit = input.noCommit;

      // Handle abort
      if (abort) {
        const result = await git(["cherry-pick", "--abort"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git cherry-pick --abort failed: ${result.stderr}`);
        }
        const parsed = parseCherryPick(result.stdout, result.stderr, result.exitCode, []);
        return dualOutput(parsed, formatCherryPick);
      }

      // Handle continue
      if (cont) {
        const result = await git(["cherry-pick", "--continue"], cwd);
        const parsed = parseCherryPick(result.stdout, result.stderr, result.exitCode, commits);
        if (result.exitCode !== 0 && parsed.conflicts.length === 0) {
          throw new Error(`git cherry-pick --continue failed: ${result.stderr}`);
        }
        return dualOutput(parsed, formatCherryPick);
      }

      // Validate commits
      if (commits.length === 0) {
        throw new Error("commits array is required when not using abort or continue");
      }

      for (const c of commits) {
        assertNoFlagInjection(c, "commits");
      }

      // Build cherry-pick args
      const args = ["cherry-pick"];
      if (noCommit) args.push("-n");
      args.push(...commits);

      const result = await git(args, cwd);

      // On conflicts, do NOT throw — return success: false with conflict list
      const parsed = parseCherryPick(result.stdout, result.stderr, result.exitCode, commits);
      if (result.exitCode !== 0 && parsed.conflicts.length === 0) {
        throw new Error(`git cherry-pick failed: ${result.stderr}`);
      }

      return dualOutput(parsed, formatCherryPick);
    },
  );
}
