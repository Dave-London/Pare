import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parsePull } from "../lib/parsers.js";
import { formatPull } from "../lib/formatters.js";
import { GitPullSchema } from "../schemas/index.js";

/** Registers the `pull` tool on the given MCP server. */
export function registerPullTool(server: McpServer) {
  server.registerTool(
    "pull",
    {
      title: "Git Pull",
      description:
        "Pulls changes from a remote repository. Returns structured data with success status, summary, change statistics, conflicts, up-to-date and fast-forward indicators.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        remote: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("origin")
          .describe('Remote name (default: "origin")'),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch to pull (default: current tracking branch)"),
        rebase: z
          .boolean()
          .optional()
          .default(false)
          .describe("Use rebase instead of merge (--rebase)"),
        rebaseMode: z
          .enum(["true", "false", "merges", "interactive"])
          .optional()
          .describe("Control rebase behavior (--rebase=<mode>)"),
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
        ffOnly: z.boolean().optional().describe("Only fast-forward pulls (--ff-only)"),
        autostash: z.boolean().optional().describe("Stash/unstash around pull (--autostash)"),
        noCommit: z.boolean().optional().describe("Pull without auto-committing (--no-commit)"),
        depth: z.number().optional().describe("Shallow fetch depth (--depth)"),
        noVerify: z.boolean().optional().describe("Bypass pre-merge hooks (--no-verify)"),
        squash: z.boolean().optional().describe("Squash pull (--squash)"),
      },
      outputSchema: GitPullSchema,
    },
    async ({
      path,
      remote,
      branch,
      rebase,
      rebaseMode,
      strategy,
      strategyOption,
      ffOnly,
      autostash,
      noCommit,
      depth,
      noVerify,
      squash,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(remote, "remote");
      if (branch) {
        assertNoFlagInjection(branch, "branch");
      }
      if (strategy) assertNoFlagInjection(strategy, "strategy");
      if (strategyOption) assertNoFlagInjection(strategyOption, "strategyOption");

      const args = ["pull"];
      if (rebaseMode) {
        args.push(`--rebase=${rebaseMode}`);
      } else {
        args.push(rebase ? "--rebase" : "--no-rebase");
      }
      if (ffOnly) args.push("--ff-only");
      if (autostash) args.push("--autostash");
      if (noCommit) args.push("--no-commit");
      if (depth !== undefined) args.push(`--depth=${depth}`);
      if (noVerify) args.push("--no-verify");
      if (squash) args.push("--squash");
      if (strategy) args.push(`--strategy=${strategy}`);
      if (strategyOption) args.push(`-X${strategyOption}`);
      args.push(remote);
      if (branch) args.push(branch);

      const result = await git(args, cwd);

      // Pull can exit non-zero for conflicts but still produce useful output
      if (result.exitCode !== 0) {
        // Check if it's a conflict situation (still parseable)
        const combined = `${result.stdout}\n${result.stderr}`;
        if (/CONFLICT/.test(combined)) {
          const pullResult = parsePull(result.stdout, result.stderr);
          return dualOutput(pullResult, formatPull);
        }
        throw new Error(`git pull failed: ${result.stderr}`);
      }

      const pullResult = parsePull(result.stdout, result.stderr);
      return dualOutput(pullResult, formatPull);
    },
  );
}
