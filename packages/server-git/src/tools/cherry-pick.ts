import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCherryPick } from "../lib/parsers.js";
import { formatCherryPick } from "../lib/formatters.js";
import { GitCherryPickSchema } from "../schemas/index.js";

/** Registers the `cherry-pick` tool on the given MCP server. */
export function registerCherryPickTool(server: McpServer) {
  server.registerTool(
    "cherry-pick",
    {
      title: "Git Cherry-Pick",
      description:
        "Applies specific commits to the current branch. Returns structured data with applied commits, any conflicts, and new commit hash. Use instead of running `git cherry-pick` in the terminal.",
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
        skip: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip current cherry-pick and continue (--skip)"),
        quit: z
          .boolean()
          .optional()
          .default(false)
          .describe("Quit cherry-pick without reverting (--quit)"),
        noCommit: z
          .boolean()
          .optional()
          .default(false)
          .describe("Apply changes without committing (-n)"),
        mainline: z
          .number()
          .optional()
          .describe("Parent number for cherry-picking merge commits (-m/--mainline)"),
        appendCherryPickLine: z
          .boolean()
          .optional()
          .describe('Append "(cherry picked from commit ...)" to message (-x)'),
        allowEmpty: z.boolean().optional().describe("Allow empty commits (--allow-empty)"),
        signoff: z.boolean().optional().describe("Add Signed-off-by trailer (-s/--signoff)"),
        keepRedundantCommits: z
          .boolean()
          .optional()
          .describe("Keep redundant/empty commits (--keep-redundant-commits)"),
        strategy: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Merge strategy (--strategy), e.g. recursive, ort"),
        strategyOption: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Strategy-specific option (-X/--strategy-option), e.g. theirs, ours"),
      },
      outputSchema: GitCherryPickSchema,
    },
    async (input) => {
      const cwd = input.path || process.cwd();
      const commits = input.commits;
      const abort = input.abort;
      const cont = input.continue;
      const skip = input.skip;
      const quit = input.quit;
      const noCommit = input.noCommit;

      // Set GIT_EDITOR=true to prevent editor launch in non-interactive mode
      const env = { ...process.env, GIT_EDITOR: "true" };

      // Handle abort
      if (abort) {
        const result = await git(["cherry-pick", "--abort"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git cherry-pick --abort failed: ${result.stderr}`);
        }
        const parsed = parseCherryPick(result.stdout, result.stderr, result.exitCode, []);
        return dualOutput(parsed, formatCherryPick);
      }

      // Handle skip
      if (skip) {
        const result = await git(["cherry-pick", "--skip"], cwd);
        const parsed = parseCherryPick(result.stdout, result.stderr, result.exitCode, commits);
        if (result.exitCode !== 0 && parsed.conflicts.length === 0) {
          throw new Error(`git cherry-pick --skip failed: ${result.stderr}`);
        }
        return dualOutput(parsed, formatCherryPick);
      }

      // Handle quit
      if (quit) {
        const result = await git(["cherry-pick", "--quit"], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git cherry-pick --quit failed: ${result.stderr}`);
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
        throw new Error("commits array is required when not using abort, continue, skip, or quit");
      }

      for (const c of commits) {
        assertNoFlagInjection(c, "commits");
      }

      // Build cherry-pick args
      const args = ["cherry-pick"];
      if (noCommit) args.push("-n");
      if (input.mainline !== undefined) args.push("-m", String(input.mainline));
      if (input.appendCherryPickLine) args.push("-x");
      if (input.allowEmpty) args.push("--allow-empty");
      if (input.signoff) args.push("--signoff");
      if (input.keepRedundantCommits) args.push("--keep-redundant-commits");
      if (input.strategy) {
        assertNoFlagInjection(input.strategy, "strategy");
        args.push(`--strategy=${input.strategy}`);
      }
      if (input.strategyOption) {
        assertNoFlagInjection(input.strategyOption, "strategyOption");
        args.push(`-X${input.strategyOption}`);
      }
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
