import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { eslint } from "../lib/lint-runner.js";
import { parseEslintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `lint` tool on the given MCP server. */
export function registerLintTool(server: McpServer) {
  server.registerTool(
    "lint",
    {
      title: "ESLint Check",
      description:
        "Runs ESLint and returns structured diagnostics (file, line, column, rule, severity, message). Use instead of running `eslint` in the terminal.",
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
        noIgnore: z
          .boolean()
          .optional()
          .describe("Disable ignore patterns to lint normally-ignored files (maps to --no-ignore)"),
        cache: z
          .boolean()
          .optional()
          .describe("Cache lint results for faster subsequent runs (maps to --cache)"),
        fixDryRun: z
          .boolean()
          .optional()
          .describe("Preview fixes without writing them (maps to --fix-dry-run)"),
        maxWarnings: z
          .number()
          .int()
          .min(-1)
          .optional()
          .describe(
            "Maximum number of warnings before failing (maps to --max-warnings). Use -1 for no limit.",
          ),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to ESLint configuration file (maps to --config)"),
        fixType: z
          .array(z.enum(["problem", "suggestion", "layout", "directive"]))
          .max(4)
          .optional()
          .describe(
            "Types of fixes to apply (maps to --fix-type). Requires --fix or --fix-dry-run.",
          ),
        rule: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Ad-hoc rule overrides, e.g. ['no-console: error'] (maps to --rule)"),
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
      noIgnore,
      cache,
      fixDryRun,
      maxWarnings,
      config,
      fixType,
      rule,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");
      if (quiet) args.push("--quiet");
      if (noIgnore) args.push("--no-ignore");
      if (cache) args.push("--cache");
      if (fixDryRun) args.push("--fix-dry-run");
      if (maxWarnings !== undefined) args.push(`--max-warnings=${maxWarnings}`);
      if (config) {
        assertNoFlagInjection(config, "config");
        args.push(`--config=${config}`);
      }
      if (fixType && fixType.length > 0) {
        args.push(`--fix-type=${fixType.join(",")}`);
      }
      if (rule) {
        for (const r of rule) {
          assertNoFlagInjection(r, "rule");
          args.push("--rule", r);
        }
      }

      const result = await eslint(args, cwd);
      const data = parseEslintJson(result.stdout);
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
