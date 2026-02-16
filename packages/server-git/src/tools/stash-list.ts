import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
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
        "Lists all stash entries with index, message, date, branch, and optional file change summary. Returns structured stash data. Use instead of running `git stash list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        maxCount: z.number().optional().describe("Limit number of stash entries (-n/--max-count)"),
        grep: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter stash entries by message (--grep)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter stash entries by date (--since)"),
        dateFormat: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Control date format (--date), e.g. short, iso, relative"),
        stat: z.boolean().optional().describe("Include diffstat per stash (--stat)"),
        includeSummary: z
          .boolean()
          .optional()
          .describe(
            "Include file count and change summary per stash entry. Runs an additional git stash show per entry.",
          ),
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
    async ({ path, maxCount, grep, since, dateFormat, stat, includeSummary, compact }) => {
      const cwd = path || process.cwd();
      const dateArg = dateFormat || "iso";
      const args = ["stash", "list", `--format=%gd\t%gs\t%cd`, `--date=${dateArg}`];
      if (maxCount !== undefined) args.push(`--max-count=${maxCount}`);
      if (stat) args.push("--stat");
      if (grep) {
        assertNoFlagInjection(grep, "grep");
        args.push(`--grep=${grep}`);
      }
      if (since) {
        assertNoFlagInjection(since, "since");
        args.push(`--since=${since}`);
      }
      if (dateFormat) {
        assertNoFlagInjection(dateFormat, "dateFormat");
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git stash list failed: ${result.stderr}`);
      }

      const stashList = parseStashListOutput(result.stdout);

      // Gap #140: Add file change summary per stash entry
      if (includeSummary && stashList.stashes.length > 0) {
        // Run git stash show --stat for each stash entry to get file count and summary
        await Promise.all(
          stashList.stashes.map(async (stash) => {
            const showResult = await git(
              ["stash", "show", "--stat", `stash@{${stash.index}}`],
              cwd,
            );
            if (showResult.exitCode === 0 && showResult.stdout.trim()) {
              const showOutput = showResult.stdout.trim();
              // Parse the summary line: " N files changed, X insertions(+), Y deletions(-)"
              const summaryMatch = showOutput.match(/(\d+)\s+files?\s+changed.*$/m);
              if (summaryMatch) {
                stash.files = parseInt(summaryMatch[1], 10);
                stash.summary = summaryMatch[0].trim();
              }
            }
          }),
        );
      }

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
