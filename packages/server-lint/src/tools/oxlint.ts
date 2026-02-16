import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { oxlintCmd } from "../lib/lint-runner.js";
import { parseOxlintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `oxlint` tool on the given MCP server. */
export function registerOxlintTool(server: McpServer) {
  server.registerTool(
    "oxlint",
    {
      title: "Oxlint Check",
      description:
        "Runs Oxlint and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `oxlint` in the terminal.",
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
        fix: z.boolean().optional().describe("Auto-fix problems (maps to --fix)"),
        quiet: z
          .boolean()
          .optional()
          .describe("Report errors only, suppress warnings (maps to --quiet)"),
        fixSuggestions: z
          .boolean()
          .optional()
          .describe("Apply suggestion-level fixes (maps to --fix-suggestions)"),
        threads: z.number().optional().describe("Number of threads to use for parallel linting"),
        noIgnore: z.boolean().optional().describe("Disable ignore patterns (maps to --no-ignore)"),
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
    async ({ path, patterns, fix, quiet, fixSuggestions, threads, noIgnore, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");
      if (quiet) args.push("--quiet");
      if (fixSuggestions) args.push("--fix-suggestions");
      if (threads !== undefined) args.push(`--threads=${threads}`);
      if (noIgnore) args.push("--no-ignore");

      const result = await oxlintCmd(args, cwd);
      const data = parseOxlintJson(result.stdout);
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
