import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { prettier } from "../lib/lint-runner.js";
import { parsePrettierCheck } from "../lib/parsers.js";
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
    async ({ path, patterns, ignoreUnknown, cache, noConfig, logLevel, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--check"];
      if (ignoreUnknown) args.push("--ignore-unknown");
      if (cache) args.push("--cache");
      if (noConfig) args.push("--no-config");
      if (logLevel) args.push(`--log-level=${logLevel}`);
      args.push(...(patterns || ["."]));

      const result = await prettier(args, cwd);
      const data = parsePrettierCheck(result.stdout, result.stderr, result.exitCode);
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
