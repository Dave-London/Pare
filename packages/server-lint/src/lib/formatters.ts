import type { LintResult, FormatCheckResult } from "../schemas/index.js";

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

export function formatFormatCheck(data: FormatCheckResult): string {
  if (data.formatted) return "All files are formatted.";

  const lines = [`${data.total} files need formatting:`];
  for (const f of data.files) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}
