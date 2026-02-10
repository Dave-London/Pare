import type { PipInstall, MypyResult, RuffResult, PipAuditResult } from "../schemas/index.js";

export function formatPipInstall(data: PipInstall): string {
  if (data.alreadySatisfied && data.total === 0) return "All requirements already satisfied.";
  if (!data.success) return "pip install failed.";

  const lines = [`Installed ${data.total} packages:`];
  for (const pkg of data.installed) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

export function formatMypy(data: MypyResult): string {
  if (data.success && data.total === 0) return "mypy: no errors found.";

  const lines = [`mypy: ${data.errors} errors, ${data.warnings} warnings/notes`];
  for (const d of data.diagnostics) {
    const col = d.column ? `:${d.column}` : "";
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}${col} ${d.severity}: ${d.message}${code}`);
  }
  return lines.join("\n");
}

export function formatRuff(data: RuffResult): string {
  if (data.total === 0) return "ruff: no issues found.";

  const lines = [`ruff: ${data.total} issues (${data.fixable} fixable)`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`);
  }
  return lines.join("\n");
}

export function formatPipAudit(data: PipAuditResult): string {
  if (data.total === 0) return "No vulnerabilities found.";

  const lines = [`${data.total} vulnerabilities:`];
  for (const v of data.vulnerabilities) {
    const fix = v.fixVersions.length ? ` (fix: ${v.fixVersions.join(", ")})` : "";
    lines.push(`  ${v.name}==${v.version} ${v.id}: ${v.description}${fix}`);
  }
  return lines.join("\n");
}
