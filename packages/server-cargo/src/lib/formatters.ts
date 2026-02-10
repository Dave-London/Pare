import type { CargoBuildResult, CargoTestResult, CargoClippyResult } from "../schemas/index.js";

export function formatCargoBuild(data: CargoBuildResult): string {
  if (data.success && data.total === 0) return "cargo build: success, no diagnostics.";

  const status = data.success ? "success" : "failed";
  const lines = [`cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)`];
  for (const d of data.diagnostics) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
  }
  return lines.join("\n");
}

export function formatCargoTest(data: CargoTestResult): string {
  const status = data.success ? "ok" : "FAILED";
  const lines = [
    `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored`,
  ];
  for (const t of data.tests) {
    lines.push(`  ${t.status.padEnd(7)} ${t.name}`);
  }
  return lines.join("\n");
}

export function formatCargoClippy(data: CargoClippyResult): string {
  if (data.total === 0) return "clippy: no warnings.";

  const lines = [`clippy: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
  }
  return lines.join("\n");
}
