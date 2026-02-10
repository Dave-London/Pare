import type { TestRun, Coverage } from "../schemas/index.js";

/** Formats structured test run results into a human-readable summary with pass/fail counts and failure details. */
export function formatTestRun(r: TestRun): string {
  const status = r.summary.failed > 0 ? "FAIL" : "PASS";
  const parts = [
    `${status} (${r.framework}) ${r.summary.total} tests: ${r.summary.passed} passed, ${r.summary.failed} failed, ${r.summary.skipped} skipped [${r.summary.duration}s]`,
  ];

  for (const f of r.failures) {
    const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "";
    parts.push(`  FAIL ${f.name}${loc ? ` (${loc})` : ""}: ${f.message}`);
  }

  return parts.join("\n");
}

/** Formats structured coverage data into a human-readable summary with per-file line coverage. */
export function formatCoverage(c: Coverage): string {
  const parts = [`Coverage (${c.framework}): ${c.summary.lines}% lines`];

  if (c.summary.branches !== undefined) parts[0] += `, ${c.summary.branches}% branches`;
  if (c.summary.functions !== undefined) parts[0] += `, ${c.summary.functions}% functions`;

  for (const f of c.files) {
    parts.push(`  ${f.file}: ${f.lines}% lines`);
  }

  return parts.join("\n");
}
