import type { LintResult, LintDiagnostic, FormatCheckResult } from "../schemas/index.js";

/**
 * Parses ESLint JSON output (from `eslint --format json`).
 *
 * ESLint JSON format is an array of objects:
 * [{ filePath, messages: [{ ruleId, severity, message, line, column, endLine, endColumn, fix }], errorCount, warningCount }]
 */
export function parseEslintJson(stdout: string): LintResult {
  let files: EslintJsonEntry[];
  try {
    files = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, fixable: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];

  for (const file of files) {
    for (const msg of file.messages) {
      diagnostics.push({
        file: file.filePath,
        line: msg.line ?? 0,
        column: msg.column ?? 0,
        endLine: msg.endLine,
        endColumn: msg.endColumn,
        severity: msg.severity === 2 ? "error" : msg.severity === 1 ? "warning" : "info",
        rule: msg.ruleId ?? "unknown",
        message: msg.message,
        fixable: !!msg.fix,
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const fixable = diagnostics.filter((d) => d.fixable).length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    fixable,
    filesChecked: files.length,
  };
}

interface EslintJsonEntry {
  filePath: string;
  messages: {
    ruleId: string | null;
    severity: number;
    message: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    fix?: unknown;
  }[];
  errorCount: number;
  warningCount: number;
}

/**
 * Parses Prettier `--check` output.
 *
 * Prettier --check outputs lines like:
 * "Checking formatting...\n[warn] src/index.ts\n[warn] Code style issues found..."
 */
export function parsePrettierCheck(
  stdout: string,
  stderr: string,
  exitCode: number,
): FormatCheckResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const files: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\[warn\]\s+(.+\.\w+)$/);
    if (match) {
      files.push(match[1]);
    }
  }

  return {
    formatted: exitCode === 0,
    files,
    total: files.length,
  };
}
