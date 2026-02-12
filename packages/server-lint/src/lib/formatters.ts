import type { LintResult, FormatCheckResult, FormatWriteResult } from "../schemas/index.js";

/** Formats structured ESLint results into a human-readable diagnostic summary with file locations. */
export function formatLint(data: LintResult): string {
  if (data.total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;

  const lines = [
    `Lint: ${data.errors} errors, ${data.warnings} warnings (${data.fixable} fixable)`,
  ];
  for (const d of data.diagnostics ?? []) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity} ${d.rule}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured Prettier check results into a human-readable list of unformatted files. */
export function formatFormatCheck(data: FormatCheckResult): string {
  if (data.formatted) return "All files are formatted.";

  const lines = [`${data.total} files need formatting:`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured format-write results into a human-readable summary. */
export function formatFormatWrite(data: FormatWriteResult): string {
  if (!data.success) return "Format failed.";
  if (data.filesChanged === 0) return "All files already formatted.";

  const lines = [`Formatted ${data.filesChanged} files:`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact lint: counts only, no individual diagnostics. */
export interface LintResultCompact {
  [key: string]: unknown;
  total: number;
  errors: number;
  warnings: number;
  fixable: number;
  filesChecked: number;
}

export function compactLintMap(data: LintResult): LintResultCompact {
  return {
    total: data.total,
    errors: data.errors,
    warnings: data.warnings,
    fixable: data.fixable,
    filesChecked: data.filesChecked,
  };
}

export function formatLintCompact(data: LintResultCompact): string {
  if (data.total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;
  return `Lint: ${data.errors} errors, ${data.warnings} warnings (${data.fixable} fixable) across ${data.filesChecked} files.`;
}

/** Compact format check: counts only, no individual file paths. */
export interface FormatCheckResultCompact {
  [key: string]: unknown;
  formatted: boolean;
  total: number;
}

export function compactFormatCheckMap(data: FormatCheckResult): FormatCheckResultCompact {
  return {
    formatted: data.formatted,
    total: data.total,
  };
}

export function formatFormatCheckCompact(data: FormatCheckResultCompact): string {
  if (data.formatted) return "All files are formatted.";
  return `${data.total} files need formatting.`;
}

/** Compact format write: counts only, no individual file paths. */
export interface FormatWriteResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
}

export function compactFormatWriteMap(data: FormatWriteResult): FormatWriteResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
  };
}

export function formatFormatWriteCompact(data: FormatWriteResultCompact): string {
  if (!data.success) return "Format failed.";
  if (data.filesChanged === 0) return "All files already formatted.";
  return `Formatted ${data.filesChanged} files.`;
}
