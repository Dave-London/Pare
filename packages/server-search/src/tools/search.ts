import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { rgCmd } from "../lib/search-runner.js";
import { parseRgJsonOutput } from "../lib/parsers.js";
import { formatSearch, compactSearchMap, formatSearchCompact } from "../lib/formatters.js";
import { SearchResultSchema } from "../schemas/index.js";

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
          .default(1000)
          .describe("Maximum number of matches to return (default: 1000)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: SearchResultSchema,
    },
    async ({ pattern, path, glob, caseSensitive, maxResults, compact }) => {
      assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (glob) assertNoFlagInjection(glob, "glob");

      const cwd = path || process.cwd();
      const args = ["--json"];

      if (!caseSensitive) {
        args.push("--ignore-case");
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
