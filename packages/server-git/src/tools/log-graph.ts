import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseLogGraph } from "../lib/parsers.js";
import { formatLogGraph, compactLogGraphMap, formatLogGraphCompact } from "../lib/formatters.js";
import { GitLogGraphSchema } from "../schemas/index.js";

/** Registers the `log-graph` tool on the given MCP server. */
export function registerLogGraphTool(server: McpServer) {
  server.registerTool(
    "log-graph",
    {
      title: "Git Log Graph",
      description:
        "Returns visual branch topology as structured data. Wraps `git log --graph --oneline --decorate`. Use instead of running `git log --graph` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        maxCount: z
          .number()
          .optional()
          .default(20)
          .describe("Number of commits to return (default: 20)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch, tag, or commit to start from"),
        all: z.boolean().optional().default(false).describe("Show all branches (--all)"),
        firstParent: z
          .boolean()
          .optional()
          .describe("Simplify graph to first parents only (--first-parent)"),
        noMerges: z.boolean().optional().describe("Exclude merge commits (--no-merges)"),
        simplifyByDecoration: z
          .boolean()
          .optional()
          .describe("Show only decorated commits (--simplify-by-decoration)"),
        branches: z.boolean().optional().describe("Show all branches (--branches)"),
        remotes: z.boolean().optional().describe("Show remote branches (--remotes)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitLogGraphSchema,
    },
    async ({
      path,
      maxCount,
      ref,
      all,
      firstParent,
      noMerges,
      simplifyByDecoration,
      branches,
      remotes,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const args = ["log", "--graph", "--oneline", "--decorate", `--max-count=${maxCount ?? 20}`];

      if (all) {
        args.push("--all");
      }
      if (firstParent) args.push("--first-parent");
      if (noMerges) args.push("--no-merges");
      if (simplifyByDecoration) args.push("--simplify-by-decoration");
      if (branches) args.push("--branches");
      if (remotes) args.push("--remotes");

      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git log --graph failed: ${result.stderr}`);
      }

      const logGraph = parseLogGraph(result.stdout);
      return compactDualOutput(
        logGraph,
        result.stdout,
        formatLogGraph,
        compactLogGraphMap,
        formatLogGraphCompact,
        compact === false,
      );
    },
  );
}
