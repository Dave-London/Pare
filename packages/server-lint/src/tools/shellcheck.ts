import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { shellcheckCmd } from "../lib/lint-runner.js";
import { parseShellcheckJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `shellcheck` tool on the given MCP server. */
export function registerShellcheckTool(server: McpServer) {
  server.registerTool(
    "shellcheck",
    {
      title: "ShellCheck",
      description:
        "Runs ShellCheck (shell script linter) and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `shellcheck` in the terminal.",
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
        shell: z
          .enum(["sh", "bash", "dash", "ksh"])
          .optional()
          .describe("Shell dialect to assume (maps to --shell)"),
        externalSources: z
          .boolean()
          .optional()
          .describe(
            "Allow following source statements to external files (maps to --external-sources)",
          ),
        checkSourced: z
          .boolean()
          .optional()
          .describe("Check sourced/included files (maps to --check-sourced)"),
        norc: z
          .boolean()
          .optional()
          .describe("Disable .shellcheckrc config file lookup (maps to --norc)"),
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
    async ({ path, patterns, severity, shell, externalSources, checkSourced, norc, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format=json"];
      if (severity) args.push(`--severity=${severity}`);
      if (shell) args.push(`--shell=${shell}`);
      if (externalSources) args.push("--external-sources");
      if (checkSourced) args.push("--check-sourced");
      if (norc) args.push("--norc");
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
