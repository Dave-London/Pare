import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { gofmtCmd } from "../lib/go-runner.js";
import { parseGoFmtOutput } from "../lib/parsers.js";
import { formatGoFmt, compactFmtMap, formatFmtCompact } from "../lib/formatters.js";
import { GoFmtResultSchema } from "../schemas/index.js";

/** Registers the `fmt` tool on the given MCP server. */
export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Go Fmt",
      description:
        "Checks or fixes Go source formatting using gofmt. In check mode (-l), lists unformatted files. In fix mode (-w), rewrites files. Use instead of running `gofmt` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check mode: list unformatted files without fixing (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoFmtResultSchema,
    },
    async ({ path, patterns, check, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const flag = check ? "-l" : "-w";
      const args = [flag, ...(patterns || ["."])];
      const result = await gofmtCmd(args, cwd);
      const data = parseGoFmtOutput(result.stdout, result.stderr, result.exitCode, !!check);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoFmt,
        compactFmtMap,
        formatFmtCompact,
        compact === false,
      );
    },
  );
}
