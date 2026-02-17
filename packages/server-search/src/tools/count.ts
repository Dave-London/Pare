import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { rgCmd } from "../lib/search-runner.js";
import { parseRgCountOutput } from "../lib/parsers.js";
import { formatCount, compactCountMap, formatCountCompact } from "../lib/formatters.js";
import { CountResultSchema } from "../schemas/index.js";

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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: CountResultSchema,
    },
    async ({ pattern, path, glob, caseSensitive, compact }) => {
      assertNoFlagInjection(pattern, "pattern");
      if (path) assertNoFlagInjection(path, "path");
      if (glob) assertNoFlagInjection(glob, "glob");

      const cwd = path || process.cwd();
      const args = ["--count"];

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
      const data = parseRgCountOutput(result.stdout);
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
