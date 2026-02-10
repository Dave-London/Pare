import type { TscResult, BuildResult } from "../schemas/index.js";

export function formatTsc(data: TscResult): string {
  if (data.success && data.total === 0) return "TypeScript: no errors found.";

  const lines = [`TypeScript: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity} TS${d.code}: ${d.message}`);
  }
  return lines.join("\n");
}

export function formatBuildCommand(data: BuildResult): string {
  if (data.success) {
    const parts = [`Build succeeded in ${data.duration}s`];
    if (data.warnings.length) parts.push(`${data.warnings.length} warnings`);
    return parts.join(", ");
  }

  const lines = [`Build failed (${data.duration}s)`];
  for (const err of data.errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}
