import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { prettier } from "../lib/lint-runner.js";
import { parsePrettierListDifferent } from "../lib/parsers.js";
import {
  formatFormatCheck,
  compactFormatCheckMap,
  formatFormatCheckCompact,
} from "../lib/formatters.js";
import { FormatCheckResultSchema } from "../schemas/index.js";

/** Registers the `format-check` tool on the given MCP server. */
export function registerFormatCheckTool(server: McpServer) {
  server.registerTool(
    "format-check",
    {
      title: "Prettier Check",
      description:
        "Checks if files are formatted and returns a structured list of files needing formatting. Use instead of running `prettier --check` in the terminal.",
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
          .describe("File patterns to check (default: ['.'])"),
        ignoreUnknown: z
          .boolean()
          .optional()
          .describe("Ignore files that cannot be parsed (maps to --ignore-unknown)"),
        cache: z
          .boolean()
          .optional()
          .describe("Cache formatted files for faster subsequent checks (maps to --cache)"),
        noConfig: z
          .boolean()
          .optional()
          .describe("Do not look for a configuration file (maps to --no-config)"),
        logLevel: z
          .enum(["silent", "error", "warn", "log", "debug"])
          .optional()
          .describe("Log level to control output verbosity"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a Prettier configuration file (maps to --config)"),
        ignorePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a custom ignore file (maps to --ignore-path)"),
        parser: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Force a specific parser for ambiguous file types (maps to --parser)"),
        tabWidth: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Number of spaces per indentation level (maps to --tab-width)"),
        singleQuote: z
          .boolean()
          .optional()
          .describe("Use single quotes instead of double quotes where possible"),
        trailingComma: z
          .enum(["all", "es5", "none"])
          .optional()
          .describe("Print trailing commas wherever possible"),
        printWidth: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("The line length where Prettier will try to wrap"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: FormatCheckResultSchema,
    },
    async ({
      path,
      patterns,
      ignoreUnknown,
      cache,
      noConfig,
      logLevel,
      config,
      ignorePath,
      parser,
      tabWidth,
      singleQuote,
      trailingComma,
      printWidth,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--list-different"];
      if (ignoreUnknown) args.push("--ignore-unknown");
      if (cache) args.push("--cache");
      if (noConfig) args.push("--no-config");
      if (logLevel) args.push(`--log-level=${logLevel}`);
      if (config) {
        assertNoFlagInjection(config, "config");
        args.push(`--config=${config}`);
      }
      if (ignorePath) {
        assertNoFlagInjection(ignorePath, "ignorePath");
        args.push(`--ignore-path=${ignorePath}`);
      }
      if (parser) {
        assertNoFlagInjection(parser, "parser");
        args.push(`--parser=${parser}`);
      }
      if (tabWidth !== undefined) args.push(`--tab-width=${tabWidth}`);
      if (singleQuote !== undefined) args.push(`--single-quote=${singleQuote}`);
      if (trailingComma) args.push(`--trailing-comma=${trailingComma}`);
      if (printWidth !== undefined) args.push(`--print-width=${printWidth}`);
      args.push(...(patterns || ["."]));

      const result = await prettier(args, cwd);
      const files = parsePrettierListDifferent(result.stdout);
      const data = {
        formatted: result.exitCode === 0,
        files,
        total: files.length,
      };
      return compactDualOutput(
        data,
        result.stdout,
        formatFormatCheck,
        compactFormatCheckMap,
        formatFormatCheckCompact,
        compact === false,
      );
    },
  );
}
