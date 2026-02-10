import type { GoBuildResult, GoTestResult, GoVetResult } from "../schemas/index.js";

export function formatGoBuild(data: GoBuildResult): string {
  if (data.success) return "go build: success.";

  const lines = [`go build: ${data.total} errors`];
  for (const e of data.errors) {
    const col = e.column ? `:${e.column}` : "";
    lines.push(`  ${e.file}:${e.line}${col}: ${e.message}`);
  }
  return lines.join("\n");
}

export function formatGoTest(data: GoTestResult): string {
  const status = data.success ? "ok" : "FAIL";
  const lines = [
    `${status}: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped`,
  ];
  for (const t of data.tests) {
    const elapsed = t.elapsed !== undefined ? ` (${t.elapsed}s)` : "";
    lines.push(`  ${t.status.padEnd(4)} ${t.package}/${t.name}${elapsed}`);
  }
  return lines.join("\n");
}

export function formatGoVet(data: GoVetResult): string {
  if (data.total === 0) return "go vet: no issues found.";

  const lines = [`go vet: ${data.total} issues`];
  for (const d of data.diagnostics) {
    const col = d.column ? `:${d.column}` : "";
    lines.push(`  ${d.file}:${d.line}${col}: ${d.message}`);
  }
  return lines.join("\n");
}
