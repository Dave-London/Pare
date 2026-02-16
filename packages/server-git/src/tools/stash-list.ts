import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseStashListOutput } from "../lib/parsers.js";
import { formatStashList, compactStashListMap, formatStashListCompact } from "../lib/formatters.js";
import { GitStashListSchema } from "../schemas/index.js";

/** Registers the `stash-list` tool on the given MCP server. */
export function registerStashListTool(server: McpServer) {
  server.registerTool(
    "stash-list",
    {
      title: "Git Stash List",
      description:
        "Lists all stash entries with index, message, and date. Returns structured stash data. Use instead of running `git stash list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        maxCount: z.number().optional().describe("Limit number of stash entries (-n/--max-count)"),
        stat: z.boolean().optional().describe("Include diffstat per stash (--stat)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitStashListSchema,
    },
    async ({ path, maxCount, stat, compact }) => {
      const cwd = path || process.cwd();
      const args = ["stash", "list", "--format=%gd\t%gs\t%ci"];
      if (maxCount !== undefined) args.push(`--max-count=${maxCount}`);
      if (stat) args.push("--stat");

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git stash list failed: ${result.stderr}`);
      }

      const stashList = parseStashListOutput(result.stdout);
      return compactDualOutput(
        stashList,
        result.stdout,
        formatStashList,
        compactStashListMap,
        formatStashListCompact,
        compact === false,
      );
    },
  );
}
