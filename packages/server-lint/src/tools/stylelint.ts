import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { stylelintCmd } from "../lib/lint-runner.js";
import { parseStylelintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

export function registerStylelintTool(server: McpServer) {
  server.registerTool(
    "stylelint",
    {
      title: "Stylelint Check",
      description:
        "Runs Stylelint and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `stylelint` in the terminal.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: LintResultSchema,
    },
    async ({ path, patterns, fix, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--formatter", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");

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
