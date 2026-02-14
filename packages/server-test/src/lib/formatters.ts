import type { TestRun, Coverage, PlaywrightResult } from "../schemas/index.js";

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

  for (const f of c.files ?? []) {
    parts.push(`  ${f.file}: ${f.lines}% lines`);
  }

  return parts.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact test run: summary + framework + failure names and messages (no stacks, expected/actual). */
export interface TestRunCompact {
  [key: string]: unknown;
  framework: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  failures: Array<{ name: string; message?: string }>;
}

export function compactTestRunMap(r: TestRun): TestRunCompact {
  return {
    framework: r.framework,
    summary: { ...r.summary },
    failures: r.failures.map((f) => ({
      name: f.name,
      ...(f.message ? { message: f.message } : {}),
    })),
  };
}

export function formatTestRunCompact(r: TestRunCompact): string {
  const status = r.summary.failed > 0 ? "FAIL" : "PASS";
  const parts = [
    `${status} (${r.framework}) ${r.summary.total} tests: ${r.summary.passed} passed, ${r.summary.failed} failed, ${r.summary.skipped} skipped [${r.summary.duration}s]`,
  ];

  for (const f of r.failures) {
    parts.push(`  FAIL ${f.name}${f.message ? `: ${f.message}` : ""}`);
  }

  return parts.join("\n");
}

/** Compact coverage: summary totals + file count only (no per-file details). */
export interface CoverageCompact {
  [key: string]: unknown;
  framework: string;
  summary: {
    lines: number;
    branches?: number;
    functions?: number;
  };
  totalFiles: number;
}

export function compactCoverageMap(c: Coverage): CoverageCompact {
  return {
    framework: c.framework,
    summary: { ...c.summary },
    totalFiles: (c.files ?? []).length,
  };
}

export function formatCoverageCompact(c: CoverageCompact): string {
  const parts = [`Coverage (${c.framework}): ${c.summary.lines}% lines`];

  if (c.summary.branches !== undefined) parts[0] += `, ${c.summary.branches}% branches`;
  if (c.summary.functions !== undefined) parts[0] += `, ${c.summary.functions}% functions`;

  parts.push(`${c.totalFiles} file(s) analyzed`);

  return parts.join("\n");
}

// ── Playwright formatters ─────────────────────────────────────────────

/** Formats Playwright results into a human-readable summary with failure details. */
export function formatPlaywrightResult(r: PlaywrightResult): string {
  const status = r.summary.failed > 0 || r.summary.timedOut > 0 ? "FAIL" : "PASS";
  const parts = [
    `${status} (playwright) ${r.summary.total} tests: ${r.summary.passed} passed, ${r.summary.failed} failed, ${r.summary.skipped} skipped, ${r.summary.timedOut} timed out [${r.summary.duration}s]`,
  ];

  for (const f of r.failures) {
    const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "";
    parts.push(`  FAIL ${f.title}${loc ? ` (${loc})` : ""}${f.error ? `: ${f.error}` : ""}`);
  }

  return parts.join("\n");
}

/** Compact Playwright result: summary + failure titles and errors (no suites or per-test details). */
export interface PlaywrightResultCompact {
  [key: string]: unknown;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
    interrupted: number;
    duration: number;
  };
  failures: Array<{ title: string; error?: string }>;
}

export function compactPlaywrightResultMap(r: PlaywrightResult): PlaywrightResultCompact {
  return {
    summary: { ...r.summary },
    failures: r.failures.map((f) => ({
      title: f.title,
      ...(f.error ? { error: f.error } : {}),
    })),
  };
}

export function formatPlaywrightResultCompact(r: PlaywrightResultCompact): string {
  const status = r.summary.failed > 0 || r.summary.timedOut > 0 ? "FAIL" : "PASS";
  const parts = [
    `${status} (playwright) ${r.summary.total} tests: ${r.summary.passed} passed, ${r.summary.failed} failed, ${r.summary.skipped} skipped, ${r.summary.timedOut} timed out [${r.summary.duration}s]`,
  ];

  for (const f of r.failures) {
    parts.push(`  FAIL ${f.title}${f.error ? `: ${f.error}` : ""}`);
  }

  return parts.join("\n");
}
