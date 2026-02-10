import type { LintResult, FormatCheckResult, FormatWriteResult } from "../schemas/index.js";

/** Formats structured ESLint results into a human-readable diagnostic summary with file locations. */
export function formatLint(data: LintResult): string {
  if (data.total === 0) return `Lint: no issues found (${data.filesChecked} files checked).`;

  const lines = [
    `Lint: ${data.errors} errors, ${data.warnings} warnings (${data.fixable} fixable)`,
  ];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity} ${d.rule}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured Prettier check results into a human-readable list of unformatted files. */
export function formatFormatCheck(data: FormatCheckResult): string {
  if (data.formatted) return "All files are formatted.";

  const lines = [`${data.total} files need formatting:`];
  for (const f of data.files) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured format-write results into a human-readable summary. */
export function formatFormatWrite(data: FormatWriteResult): string {
  if (!data.success) return "Format failed.";
  if (data.filesChanged === 0) return "All files already formatted.";

  const lines = [`Formatted ${data.filesChanged} files:`];
  for (const f of data.files) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}
