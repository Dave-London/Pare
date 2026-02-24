import type { LintResult, FormatCheckResult, FormatWriteResult } from "../schemas/index.js";

/** Formats structured ESLint results into a human-readable diagnostic summary with file locations. */
export function formatLint(data: LintResult): string {
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

/** Compact lint: counts only, no individual diagnostics. */
export interface LintResultCompact {
  [key: string]: unknown;
  errors: number;
  warnings: number;
  filesChecked: number;
  deprecationCount?: number;
}

export function compactLintMap(data: LintResult): LintResultCompact {
  const result: LintResultCompact = {
    errors: data.errors,
    warnings: data.warnings,
    filesChecked: data.filesChecked,
  };
  if (data.deprecations && data.deprecations.length > 0) {
    result.deprecationCount = data.deprecations.length;
  }
  return result;
}

export function formatLintCompact(data: LintResultCompact): string {
  const total = data.errors + data.warnings;
  if (total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;
  const suffix =
    data.deprecationCount && data.deprecationCount > 0
      ? ` (${data.deprecationCount} deprecations)`
      : "";
  return `Lint: ${data.errors} errors, ${data.warnings} warnings across ${data.filesChecked} files${suffix}.`;
}

/** Compact format check: formatted status only. */
export interface FormatCheckResultCompact {
  [key: string]: unknown;
  formatted: boolean;
}

export function compactFormatCheckMap(data: FormatCheckResult): FormatCheckResultCompact {
  return {
    formatted: data.formatted,
  };
}

export function formatFormatCheckCompact(data: FormatCheckResultCompact): string {
  if (data.formatted) return "All files are formatted.";
  return "Some files need formatting.";
}

/** Compact format write: counts only, no individual file paths. */
export interface FormatWriteResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged?: number;
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
  if (data.filesUnchanged !== undefined && data.filesUnchanged > 0) {
    return `Formatted ${data.filesChanged} files (${data.filesUnchanged} already formatted).`;
  }
  return `Formatted ${data.filesChanged} files.`;
}
