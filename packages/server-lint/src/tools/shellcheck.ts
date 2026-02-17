import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { shellcheckCmd } from "../lib/lint-runner.js";
import { parseShellcheckJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

export function registerShellcheckTool(server: McpServer) {
  server.registerTool(
    "shellcheck",
    {
      title: "ShellCheck",
      description:
        "Runs ShellCheck (shell script linter) and returns structured diagnostics (file, line, rule, severity, message).",
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
        severity: z
          .enum(["error", "warning", "info", "style"])
          .optional()
          .describe("Minimum severity level to report (default: style)"),
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
    async ({ path, patterns, severity, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format=json"];
      if (severity) {
        args.push(`--severity=${severity}`);
      }
      args.push(...(patterns || ["."]));

      const result = await shellcheckCmd(args, cwd);
      const data = parseShellcheckJson(result.stdout);
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
