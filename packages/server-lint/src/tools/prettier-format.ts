import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { prettier } from "../lib/lint-runner.js";
import { parsePrettierWrite } from "../lib/parsers.js";
import {
  formatFormatWrite,
  compactFormatWriteMap,
  formatFormatWriteCompact,
} from "../lib/formatters.js";
import { FormatWriteResultSchema } from "../schemas/index.js";

/** Registers the `prettier-format` tool on the given MCP server. */
export function registerPrettierFormatTool(server: McpServer) {
  server.registerTool(
    "prettier-format",
    {
      title: "Prettier Format",
      description:
        "Formats files with Prettier (--write) and returns a structured list of changed files. Use instead of running `prettier --write` in the terminal.",
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
        ignoreUnknown: z
          .boolean()
          .optional()
          .describe("Ignore files that cannot be parsed (maps to --ignore-unknown)"),
        cache: z
          .boolean()
          .optional()
          .describe("Cache formatted files for faster subsequent runs (maps to --cache)"),
        noConfig: z
          .boolean()
          .optional()
          .describe("Do not look for a configuration file (maps to --no-config)"),
        logLevel: z
          .enum(["silent", "error", "warn", "log", "debug"])
          .optional()
          .describe("Log level to control output verbosity"),
        endOfLine: z
          .enum(["lf", "crlf", "cr", "auto"])
          .optional()
          .describe("Line ending style override"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: FormatWriteResultSchema,
    },
    async ({ path, patterns, ignoreUnknown, cache, noConfig, logLevel, endOfLine, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--write"];
      if (ignoreUnknown) args.push("--ignore-unknown");
      if (cache) args.push("--cache");
      if (noConfig) args.push("--no-config");
      if (logLevel) args.push(`--log-level=${logLevel}`);
      if (endOfLine) args.push(`--end-of-line=${endOfLine}`);
      args.push(...(patterns || ["."]));

      const result = await prettier(args, cwd);
      const data = parsePrettierWrite(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatFormatWrite,
        compactFormatWriteMap,
        formatFormatWriteCompact,
        compact === false,
      );
    },
  );
}
