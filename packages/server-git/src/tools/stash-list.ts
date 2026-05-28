import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, repoPathInput } from "@paretools/shared";
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
        "Lists all stash entries with index, message, date, branch, and optional file change summary. Returns structured stash data.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        path: repoPathInput,
        maxCount: z.coerce
          .number()
          .optional()
          .describe("Limit number of stash entries (-n/--max-count)"),
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
        compact: compactInput,
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

      // The reflog selector (%gd) only renders the numeric index
      // (`stash@{0}`, `stash@{1}`, …) when no `--date` option is present. With
      // any `--date` (the tool always passes one), git renders the selector as
      // `stash@{<date>}`, so the parser cannot read the index and reports 0 for
      // every entry (issue #908). When the selector did not carry a usable
      // index, resolve the real incrementing indices from a date-free run that
      // applies the same filters so the entries line up by position.
      const stashLines = result.stdout.trim().split("\n").filter(Boolean);
      const indexCorrupted = stashLines.some((line) => !/^stash@\{\d+\}/.test(line));
      if (indexCorrupted && stashList.stashes.length > 0) {
        const indexArgs = ["stash", "list", "--format=%gd"];
        if (maxCount !== undefined) indexArgs.push(`--max-count=${maxCount}`);
        if (grep) indexArgs.push(`--grep=${grep}`);
        if (since) indexArgs.push(`--since=${since}`);
        const indexResult = await git(indexArgs, cwd);
        if (indexResult.exitCode === 0) {
          const realIndices = indexResult.stdout
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const m = line.match(/stash@\{(\d+)\}/);
              return m ? parseInt(m[1], 10) : undefined;
            });
          stashList.stashes.forEach((stash, i) => {
            const realIndex = realIndices[i];
            if (realIndex !== undefined) stash.index = realIndex;
          });
        }
      }

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
