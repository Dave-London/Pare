import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
} from "@paretools/shared";
import { shellcheckCmd } from "../lib/lint-runner.js";
import {
  parseShellcheckJson,
  resolveShellcheckPatterns,
  validateShellcheckPatterns,
} from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `shellcheck` tool on the given MCP server. */
export function registerShellcheckTool(server: McpServer) {
  server.registerTool(
    "shellcheck",
    {
      title: "ShellCheck",
      description:
        "Runs ShellCheck (shell script linter) and returns structured diagnostics (file, line, column, rule, severity, message). Use instead of running `shellcheck` in the terminal.",
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
          .describe(
            "File paths or glob patterns to check (default: ['.']). " +
              "Directories are automatically expanded to include *.sh, *.bash, *.zsh, *.ksh, *.dash files.",
          ),
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
        exclude: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Check codes to exclude, e.g. ['SC2086', 'SC2034'] (maps to --exclude)"),
        enable: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Optional checks to enable, e.g. ['add-default-case', 'require-variable-braces'] (maps to --enable)",
          ),
        include: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Only report these check codes (maps to --include)"),
        rcfile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a custom ShellCheck config file (maps to --rcfile)"),
        sourcePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to resolve source commands (maps to --source-path)"),
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
      severity,
      shell,
      externalSources,
      checkSourced,
      norc,
      exclude,
      enable,
      include,
      rcfile,
      sourcePath,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }

      const inputPatterns = patterns || ["."];

      // Resolve patterns: expand directories to shell script files
      const resolvedFiles = await resolveShellcheckPatterns(inputPatterns, cwd);

      // If no files were found after expansion, return a helpful empty result
      if (resolvedFiles.length === 0) {
        const validationError = validateShellcheckPatterns(inputPatterns);
        const emptyResult = {
          diagnostics: [],
          total: 0,
          errors: 0,
          warnings: 0,
          filesChecked: 0,
        };
        const message = validationError
          ? validationError
          : `No shell script files found matching patterns: ${inputPatterns.join(", ")}`;
        return dualOutput(emptyResult, () => message);
      }

      const args = ["--format=json"];
      if (severity) args.push(`--severity=${severity}`);
      if (shell) args.push(`--shell=${shell}`);
      if (externalSources) args.push("--external-sources");
      if (checkSourced) args.push("--check-sourced");
      if (norc) args.push("--norc");
      if (exclude && exclude.length > 0) {
        for (const code of exclude) {
          assertNoFlagInjection(code, "exclude");
        }
        args.push(`--exclude=${exclude.join(",")}`);
      }
      if (enable && enable.length > 0) {
        for (const check of enable) {
          assertNoFlagInjection(check, "enable");
        }
        args.push(`--enable=${enable.join(",")}`);
      }
      if (include && include.length > 0) {
        for (const code of include) {
          assertNoFlagInjection(code, "include");
        }
        args.push(`--include=${include.join(",")}`);
      }
      if (rcfile) {
        assertNoFlagInjection(rcfile, "rcfile");
        args.push(`--rcfile=${rcfile}`);
      }
      if (sourcePath) {
        assertNoFlagInjection(sourcePath, "sourcePath");
        args.push(`--source-path=${sourcePath}`);
      }
      args.push(...resolvedFiles);

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
