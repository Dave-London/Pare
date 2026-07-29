import type {
  LintResult,
  LintDiagnostic,
  FormatCheckResult,
  FormatWriteResult,
} from "../schemas/index.js";

/** Formats structured ESLint results into a human-readable diagnostic summary with file locations. */
export function formatLint(data: LintResult): string {
  if (data.error) {
    return `Lint failed (exit ${data.exitCode ?? "unknown"}): ${data.error}`;
  }
  const total = data.errors + data.warnings;
  if (total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;

  const lines = [`Lint: ${data.errors} errors, ${data.warnings} warnings`];
  if (data.fixableErrorCount || data.fixableWarningCount) {
    lines[0] += ` (${data.fixableErrorCount ?? 0} fixable errors, ${data.fixableWarningCount ?? 0} fixable warnings)`;
  }
  for (const d of data.diagnostics ?? []) {
    const loc = d.column ? `${d.file}:${d.line}:${d.column}` : `${d.file}:${d.line}`;
    lines.push(`  ${loc} ${d.severity} ${d.rule}: ${d.message}`);
  }
  if (data.deprecations && data.deprecations.length > 0) {
    lines.push("Deprecations:");
    for (const dep of data.deprecations) {
      lines.push(dep.reference ? `  ${dep.text} (${dep.reference})` : `  ${dep.text}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured Prettier check results into a human-readable list of unformatted files. */
export function formatFormatCheck(data: FormatCheckResult): string {
  if (data.error) {
    return `Format check failed (exit ${data.exitCode ?? "unknown"}): ${data.error}`;
  }
  if (data.formatted) return "All files are formatted.";

  const fileCount = (data.files ?? []).length;
  const lines = [`${fileCount} files need formatting:`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured format-write results into a human-readable summary. */
export function formatFormatWrite(data: FormatWriteResult): string {
  if (!data.success) {
    return data.errorMessage ? `Format failed: ${data.errorMessage}` : "Format failed.";
  }
  if (data.filesChanged === 0) {
    if (data.filesUnchanged !== undefined && data.filesUnchanged > 0) {
      return `All ${data.filesUnchanged} files already formatted.`;
    }
    return "All files already formatted.";
  }

  const lines = [`Formatted ${data.filesChanged} files:`];
  if (data.filesUnchanged !== undefined && data.filesUnchanged > 0) {
    lines[0] = `Formatted ${data.filesChanged} files (${data.filesUnchanged} already formatted):`;
  }
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Maximum diagnostics kept in compact lint output (#1022). */
export const COMPACT_DIAGNOSTIC_LIMIT = 25;

/** Maximum file paths kept in compact format-check/format-write output (#1021). */
export const COMPACT_FILE_LIMIT = 50;

/** Compact lint: counts plus the first {@link COMPACT_DIAGNOSTIC_LIMIT} diagnostics. */
export interface LintResultCompact {
  [key: string]: unknown;
  errors: number;
  warnings: number;
  filesChecked: number;
  diagnostics?: LintDiagnostic[];
  diagnosticsTruncated?: boolean;
  omittedCount?: number;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
  deprecationCount?: number;
  error?: string;
  exitCode?: number;
}

export function compactLintMap(data: LintResult): LintResultCompact {
  const result: LintResultCompact = {
    errors: data.errors,
    warnings: data.warnings,
    filesChecked: data.filesChecked,
  };
  const diagnostics = data.diagnostics ?? [];
  if (diagnostics.length > 0) {
    result.diagnostics = diagnostics.slice(0, COMPACT_DIAGNOSTIC_LIMIT);
    if (diagnostics.length > COMPACT_DIAGNOSTIC_LIMIT) {
      result.diagnosticsTruncated = true;
      result.omittedCount = diagnostics.length - COMPACT_DIAGNOSTIC_LIMIT;
    }
  }
  if (data.fixableErrorCount !== undefined) {
    result.fixableErrorCount = data.fixableErrorCount;
  }
  if (data.fixableWarningCount !== undefined) {
    result.fixableWarningCount = data.fixableWarningCount;
  }
  if (data.deprecations && data.deprecations.length > 0) {
    result.deprecationCount = data.deprecations.length;
  }
  if (data.error) {
    result.error = data.error;
  }
  if (data.exitCode !== undefined) {
    result.exitCode = data.exitCode;
  }
  return result;
}

export function formatLintCompact(data: LintResultCompact): string {
  if (data.error) {
    return `Lint failed (exit ${data.exitCode ?? "unknown"}): ${data.error}`;
  }
  const total = data.errors + data.warnings;
  if (total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;
  const suffix =
    data.deprecationCount && data.deprecationCount > 0
      ? ` (${data.deprecationCount} deprecations)`
      : "";
  const lines = [
    `Lint: ${data.errors} errors, ${data.warnings} warnings across ${data.filesChecked} files${suffix}.`,
  ];
  if (data.fixableErrorCount || data.fixableWarningCount) {
    lines[0] +=
      ` (${data.fixableErrorCount ?? 0} fixable errors,` +
      ` ${data.fixableWarningCount ?? 0} fixable warnings)`;
  }
  for (const d of data.diagnostics ?? []) {
    const loc = d.column ? `${d.file}:${d.line}:${d.column}` : `${d.file}:${d.line}`;
    lines.push(`  ${loc} ${d.severity} ${d.rule}: ${d.message}`);
  }
  if (data.diagnosticsTruncated && data.omittedCount) {
    lines.push(`  ... (${data.omittedCount} more diagnostics omitted)`);
  }
  return lines.join("\n");
}

/** Compact format check: formatted status plus the first {@link COMPACT_FILE_LIMIT} files. */
export interface FormatCheckResultCompact {
  [key: string]: unknown;
  formatted: boolean;
  files?: string[];
  total?: number;
  filesTruncated?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactFormatCheckMap(data: FormatCheckResult): FormatCheckResultCompact {
  const result: FormatCheckResultCompact = {
    formatted: data.formatted,
  };
  const files = data.files ?? [];
  if (files.length > 0) {
    result.files = files.slice(0, COMPACT_FILE_LIMIT);
    result.total = files.length;
    if (files.length > COMPACT_FILE_LIMIT) {
      result.filesTruncated = true;
    }
  }
  if (data.error) {
    result.error = data.error;
  }
  if (data.exitCode !== undefined) {
    result.exitCode = data.exitCode;
  }
  return result;
}

export function formatFormatCheckCompact(data: FormatCheckResultCompact): string {
  if (data.error) {
    return `Format check failed (exit ${data.exitCode ?? "unknown"}): ${data.error}`;
  }
  if (data.formatted) return "All files are formatted.";
  const files = data.files ?? [];
  if (files.length === 0) return "Some files need formatting.";
  const total = data.total ?? files.length;
  const lines = [`${total} files need formatting:`];
  for (const f of files) {
    lines.push(`  ${f}`);
  }
  if (data.filesTruncated) {
    lines.push(`  ... (${total - files.length} more files omitted)`);
  }
  return lines.join("\n");
}

/** Compact format write: counts plus the first {@link COMPACT_FILE_LIMIT} reformatted files. */
export interface FormatWriteResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged?: number;
  files?: string[];
  filesTruncated?: boolean;
  errorMessage?: string;
}

export function compactFormatWriteMap(data: FormatWriteResult): FormatWriteResultCompact {
  const result: FormatWriteResultCompact = {
    success: data.success,
    filesChanged: data.filesChanged,
  };
  if (data.filesUnchanged !== undefined) {
    result.filesUnchanged = data.filesUnchanged;
  }
  const files = data.files ?? [];
  if (files.length > 0) {
    result.files = files.slice(0, COMPACT_FILE_LIMIT);
    if (files.length > COMPACT_FILE_LIMIT) {
      result.filesTruncated = true;
    }
  }
  if (data.errorMessage) {
    result.errorMessage = data.errorMessage;
  }
  return result;
}

export function formatFormatWriteCompact(data: FormatWriteResultCompact): string {
  if (!data.success) {
    return data.errorMessage ? `Format failed: ${data.errorMessage}` : "Format failed.";
  }
  if (data.filesChanged === 0) return "All files already formatted.";
  const lines = [`Formatted ${data.filesChanged} files:`];
  if (data.filesUnchanged !== undefined && data.filesUnchanged > 0) {
    lines[0] = `Formatted ${data.filesChanged} files (${data.filesUnchanged} already formatted):`;
  }
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  if (data.filesTruncated) {
    lines.push(`  ... (${data.filesChanged - (data.files ?? []).length} more files omitted)`);
  }
  return lines.join("\n");
}
