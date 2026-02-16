import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { rgCmd } from "../lib/search-runner.js";
import { parseRgCountOutput } from "../lib/parsers.js";
import { formatCount, compactCountMap, formatCountCompact } from "../lib/formatters.js";
import { CountResultSchema } from "../schemas/index.js";

/** Registers the `count` tool on the given MCP server. */
export function registerCountTool(server: McpServer) {
  server.registerTool(
    "count",
    {
      title: "Match Count",
      description:
        "Counts pattern matches per file using ripgrep. Returns per-file match counts and totals. Use instead of running `rg --count` or `grep -c` in the terminal.",
      inputSchema: {
        pattern: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Regular expression pattern to count matches for"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory or file to search in (default: cwd)"),
        glob: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Glob pattern to filter files (e.g., '*.ts', '*.{js,jsx}')"),
        caseSensitive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Case-sensitive search (default: true)"),
        maxResults: z
          .number()
          .optional()
          .describe(
            "Maximum number of files to include in results — truncates per-file list to prevent excessive output in large repos",
          ),
        countMatches: z
          .boolean()
          .optional()
          .describe("Count per-occurrence matches instead of per-line counts (--count-matches)"),
        fixedStrings: z
          .boolean()
          .optional()
          .describe("Treat pattern as a literal string instead of regex (--fixed-strings)"),
        wordRegexp: z.boolean().optional().describe("Only match whole words (--word-regexp)"),
        invertMatch: z
          .boolean()
          .optional()
          .describe("Count non-matching lines instead of matching lines (--invert-match)"),
        hidden: z.boolean().optional().describe("Search hidden files and directories (--hidden)"),
        includeZero: z
          .boolean()
          .optional()
          .describe("Show files with zero matches (--include-zero)"),
        type: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by file type (e.g., 'ts', 'js', 'py', 'rust'). Maps to --type TYPE."),
        sort: z
          .enum(["path", "count"])
          .optional()
          .describe(
            "Sort results: 'path' for alphabetical by file path, 'count' for descending match count",
          ),
        maxDepth: z.number().optional().describe("Maximum directory depth to search (--max-depth)"),
        noIgnore: z
          .boolean()
          .optional()
          .describe("Don't respect .gitignore and other ignore files (--no-ignore)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CountResultSchema,
    },
    async ({
      pattern,
      path,
      glob,
      caseSensitive,
      maxResults,
      countMatches,
      fixedStrings,
      wordRegexp,
      invertMatch,
      hidden,
      includeZero,
      type,
      sort,
      maxDepth,
      noIgnore,
      compact,
    }) => {
      assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (glob) assertNoFlagInjection(glob, "glob");
      if (type) assertNoFlagInjection(type, "type");

      const cwd = path || process.cwd();
      const args = countMatches ? ["--count-matches"] : ["--count"];

      if (!caseSensitive) {
        args.push("--ignore-case");
      }

      if (fixedStrings) {
        args.push("--fixed-strings");
      }

      if (wordRegexp) {
        args.push("--word-regexp");
      }

      if (invertMatch) {
        args.push("--invert-match");
      }

      if (hidden) {
        args.push("--hidden");
      }

      if (includeZero) {
        args.push("--include-zero");
      }

      if (type) {
        args.push("--type", type);
      }

      if (maxDepth !== undefined) {
        args.push("--max-depth", String(maxDepth));
      }

      if (noIgnore) {
        args.push("--no-ignore");
      }

      if (glob) {
        args.push("--glob", glob);
      }

      args.push(pattern);

      // Always pass "." as the search path so rg searches the directory
      // instead of reading from stdin (which hangs when stdin is piped)
      args.push(".");
      const result = await rgCmd(args, cwd);

      // rg exits with code 1 when no matches are found — that's not an error
      let data = parseRgCountOutput(result.stdout);

      // Apply client-side sort if requested
      if (sort && data.files) {
        if (sort === "path") {
          data.files.sort((a, b) => a.file.localeCompare(b.file));
        } else if (sort === "count") {
          data.files.sort((a, b) => b.count - a.count);
        }
      }

      // Apply maxResults truncation to the per-file list
      if (maxResults !== undefined && data.files && data.files.length > maxResults) {
        data = {
          ...data,
          files: data.files.slice(0, maxResults),
        };
      }

      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatCount,
        compactCountMap,
        formatCountCompact,
        compact === false,
      );
    },
  );
}
