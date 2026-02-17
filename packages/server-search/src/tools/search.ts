import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { rgCmd } from "../lib/search-runner.js";
import { parseRgJsonOutput } from "../lib/parsers.js";
import { formatSearch, compactSearchMap, formatSearchCompact } from "../lib/formatters.js";
import { SearchResultSchema } from "../schemas/index.js";

/** Registers the `search` tool on the given MCP server. */
export function registerSearchTool(server: McpServer) {
  server.registerTool(
    "search",
    {
      title: "Code Search",
      description:
        "Searches file contents using ripgrep with structured JSON output. Returns match locations with file, line, column, matched text, and line content.",
      inputSchema: {
        pattern: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Regular expression pattern to search for"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory or file to search in"),
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
          .default(1000)
          .describe("Maximum number of matches to return (default: 1000)"),
        maxCount: z
          .number()
          .optional()
          .describe("Maximum matches per file to stop rg early (--max-count)"),
        fixedStrings: z
          .boolean()
          .optional()
          .describe("Treat pattern as a literal string instead of regex (--fixed-strings)"),
        wordRegexp: z.boolean().optional().describe("Only match whole words (--word-regexp)"),
        invertMatch: z
          .boolean()
          .optional()
          .describe("Show lines that do NOT match the pattern (--invert-match)"),
        multiline: z
          .boolean()
          .optional()
          .describe("Allow patterns to span multiple lines (--multiline)"),
        hidden: z.boolean().optional().describe("Search hidden files and directories (--hidden)"),
        type: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by file type (e.g., 'ts', 'js', 'py', 'rust'). Maps to --type TYPE."),
        sort: z
          .enum(["path", "modified", "accessed", "created"])
          .optional()
          .describe("Sort results by the specified criterion (maps to --sort TYPE)"),
        maxDepth: z.number().optional().describe("Maximum directory depth to search (--max-depth)"),
        followSymlinks: z.boolean().optional().describe("Follow symbolic links (--follow)"),
        noIgnore: z
          .boolean()
          .optional()
          .describe("Don't respect .gitignore and other ignore files (--no-ignore)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: SearchResultSchema,
    },
    async ({
      pattern,
      path,
      glob,
      caseSensitive,
      maxResults,
      maxCount,
      fixedStrings,
      wordRegexp,
      invertMatch,
      multiline,
      hidden,
      type,
      sort,
      maxDepth,
      followSymlinks,
      noIgnore,
      compact,
    }) => {
      assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (glob) assertNoFlagInjection(glob, "glob");
      if (type) assertNoFlagInjection(type, "type");

      const cwd = path || process.cwd();
      const args = ["--json"];

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

      if (multiline) {
        args.push("--multiline");
      }

      if (hidden) {
        args.push("--hidden");
      }

      if (type) {
        args.push("--type", type);
      }

      if (sort) {
        args.push("--sort", sort);
      }

      if (maxCount !== undefined) {
        args.push("--max-count", String(maxCount));
      }

      if (maxDepth !== undefined) {
        args.push("--max-depth", String(maxDepth));
      }

      if (followSymlinks) {
        args.push("--follow");
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
      const data = parseRgJsonOutput(result.stdout, maxResults ?? 1000);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatSearch,
        compactSearchMap,
        formatSearchCompact,
        compact === false,
      );
    },
  );
}
