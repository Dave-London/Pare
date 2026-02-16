import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { stylelintCmd } from "../lib/lint-runner.js";
import { parseStylelintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `stylelint` tool on the given MCP server. */
export function registerStylelintTool(server: McpServer) {
  server.registerTool(
    "stylelint",
    {
      title: "Stylelint Check",
      description:
        "Runs Stylelint and returns structured diagnostics (file, line, column, rule, severity, message). Use instead of running `stylelint` in the terminal.",
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
          .describe("File patterns to lint (default: ['.'])"),
        fix: z.boolean().optional().default(false).describe("Auto-fix problems"),
        quiet: z
          .boolean()
          .optional()
          .describe("Report errors only, suppress warnings (maps to --quiet)"),
        allowEmptyInput: z
          .boolean()
          .optional()
          .describe("Prevent errors when no files match the pattern (maps to --allow-empty-input)"),
        cache: z
          .boolean()
          .optional()
          .describe("Cache lint results for faster subsequent runs (maps to --cache)"),
        reportNeedlessDisables: z
          .boolean()
          .optional()
          .describe(
            "Report unnecessary stylelint-disable comments (maps to --report-needless-disables)",
          ),
        ignoreDisables: z
          .boolean()
          .optional()
          .describe(
            "Ignore stylelint-disable comments and enforce all rules (maps to --ignore-disables)",
          ),
        maxWarnings: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Maximum number of warnings before failing (maps to --max-warnings)"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Stylelint configuration file (maps to --config)"),
        ignorePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a custom ignore file (maps to --ignore-path)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: LintResultSchema,
    },
    async ({
      path,
      patterns,
      fix,
      quiet,
      allowEmptyInput,
      cache,
      reportNeedlessDisables,
      ignoreDisables,
      maxWarnings,
      config,
      ignorePath,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--formatter", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");
      if (quiet) args.push("--quiet");
      if (allowEmptyInput) args.push("--allow-empty-input");
      if (cache) args.push("--cache");
      if (reportNeedlessDisables) args.push("--report-needless-disables");
      if (ignoreDisables) args.push("--ignore-disables");
      if (maxWarnings !== undefined) args.push(`--max-warnings=${maxWarnings}`);
      if (config) {
        assertNoFlagInjection(config, "config");
        args.push(`--config=${config}`);
      }
      if (ignorePath) {
        assertNoFlagInjection(ignorePath, "ignorePath");
        args.push(`--ignore-path=${ignorePath}`);
      }

      const result = await stylelintCmd(args, cwd);
      const data = parseStylelintJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatLint,
        compactLintMap,
        formatLintCompact,
        compact === false,
      );
    },
  );
}
