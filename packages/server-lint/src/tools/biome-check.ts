import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { biome } from "../lib/lint-runner.js";
import { parseBiomeJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `biome-check` tool on the given MCP server. */
export function registerBiomeCheckTool(server: McpServer) {
  server.registerTool(
    "biome-check",
    {
      title: "Biome Check",
      description:
        "Runs Biome check (lint + format) and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `biome check` in the terminal.",
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
        apply: z.boolean().optional().describe("Apply safe fixes automatically (maps to --apply)"),
        applyUnsafe: z
          .boolean()
          .optional()
          .describe("Apply safe and unsafe fixes automatically (maps to --apply-unsafe)"),
        diagnosticLevel: z
          .enum(["info", "warn", "error"])
          .optional()
          .describe("Minimum diagnostic level to report"),
        changed: z
          .boolean()
          .optional()
          .describe("Only check VCS-changed files (maps to --changed)"),
        staged: z.boolean().optional().describe("Only check staged files (maps to --staged)"),
        since: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Only check files changed since this git ref (maps to --since)"),
        configPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Biome configuration file (maps to --config-path)"),
        linterEnabled: z
          .boolean()
          .optional()
          .describe("Enable or disable the linter (maps to --linter-enabled)"),
        formatterEnabled: z
          .boolean()
          .optional()
          .describe("Enable or disable the formatter (maps to --formatter-enabled)"),
        maxDiagnostics: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Maximum number of diagnostics to display (maps to --max-diagnostics)"),
        skip: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rules to skip (maps to --skip)"),
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
      apply,
      applyUnsafe,
      diagnosticLevel,
      changed,
      staged,
      since,
      configPath,
      linterEnabled,
      formatterEnabled,
      maxDiagnostics,
      skip,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["check", "--reporter=json"];
      if (apply) args.push("--apply");
      if (applyUnsafe) args.push("--apply-unsafe");
      if (diagnosticLevel) args.push(`--diagnostic-level=${diagnosticLevel}`);
      if (changed) args.push("--changed");
      if (staged) args.push("--staged");
      if (since) {
        assertNoFlagInjection(since, "since");
        args.push(`--since=${since}`);
      }
      if (configPath) {
        assertNoFlagInjection(configPath, "configPath");
        args.push(`--config-path=${configPath}`);
      }
      if (linterEnabled !== undefined) {
        args.push(`--linter-enabled=${linterEnabled}`);
      }
      if (formatterEnabled !== undefined) {
        args.push(`--formatter-enabled=${formatterEnabled}`);
      }
      if (maxDiagnostics !== undefined) {
        args.push(`--max-diagnostics=${maxDiagnostics}`);
      }
      if (skip) {
        for (const rule of skip) {
          assertNoFlagInjection(rule, "skip");
          args.push(`--skip=${rule}`);
        }
      }
      args.push(...(patterns || ["."]));

      const result = await biome(args, cwd);
      const data = parseBiomeJson(result.stdout);
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
