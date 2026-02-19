import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
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
        "Checks or fixes Go source formatting using gofmt. In check mode (-l), lists unformatted files. In fix mode (-w), rewrites files.",
      inputSchema: {
        path: projectPathInput,
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
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe("Display diffs instead of rewriting files (-d)"),
        simplify: z
          .boolean()
          .optional()
          .default(false)
          .describe("Try to simplify code in addition to formatting (-s)"),
        allErrors: z
          .boolean()
          .optional()
          .default(false)
          .describe("Report all errors, not just the first 10 per file (-e)"),
        compact: compactInput,
      },
      outputSchema: GoFmtResultSchema,
    },
    async ({ path, patterns, check, diff, simplify, allErrors, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      // In fix mode, pass -l -w -d so gofmt lists changed files, rewrites them,
      // and emits per-file diffs for structured `changes` output.
      // In check mode, only pass -l to list files that need formatting.
      const args = check ? ["-l"] : ["-l", "-w", "-d"];
      if (diff) args.push("-d");
      if (simplify) args.push("-s");
      if (allErrors) args.push("-e");
      args.push(...(patterns || ["."]));
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
