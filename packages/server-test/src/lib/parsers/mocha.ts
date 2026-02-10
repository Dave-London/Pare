import type { TestRun, Coverage } from "../../schemas/index.js";

/**
 * Mocha JSON reporter output structure (from `mocha --reporter json`).
 */
interface MochaJsonOutput {
  stats: {
    suites: number;
    tests: number;
    passes: number;
    failures: number;
    pending: number;
    duration: number;
  };
  passes: Array<{
    title: string;
    fullTitle: string;
    file?: string;
    duration?: number;
  }>;
  failures: Array<{
    title: string;
    fullTitle: string;
    file?: string;
    duration?: number;
    err: {
      message: string;
      stack?: string;
      expected?: unknown;
      actual?: unknown;
    };
  }>;
  pending: Array<{
    title: string;
    fullTitle: string;
    file?: string;
  }>;
}

/**
 * Parses Mocha JSON reporter output (`mocha --reporter json`) into structured data.
 */
export function parseMochaJson(jsonStr: string): TestRun {
  const data = JSON.parse(jsonStr) as MochaJsonOutput;

  const failures: TestRun["failures"] = [];

  for (const test of data.failures) {
    const expected =
      test.err.expected !== undefined ? String(test.err.expected) : undefined;
    const actual =
      test.err.actual !== undefined ? String(test.err.actual) : undefined;

    failures.push({
      name: test.fullTitle,
      file: test.file,
      message: test.err.message || "Test failed",
      expected,
      actual,
      stack: test.err.stack,
    });
  }

  // Duration from mocha stats is in ms, convert to seconds
  const durationSec = (data.stats.duration ?? 0) / 1000;

  return {
    framework: "mocha",
    summary: {
      total: data.stats.tests,
      passed: data.stats.passes,
      failed: data.stats.failures,
      skipped: data.stats.pending,
      duration: Math.round(durationSec * 100) / 100,
    },
    failures,
  };
}

/**
 * Parses nyc/Istanbul text coverage output for Mocha.
 *
 * Expected format (same as Jest/Vitest Istanbul output):
 *   ----------|---------|----------|---------|---------|
 *   File      | % Stmts | % Branch | % Funcs | % Lines |
 *   ----------|---------|----------|---------|---------|
 *   All files |   85.71 |    66.67 |     100 |   85.71 |
 *    foo.js   |   85.71 |    66.67 |     100 |   85.71 |
 *   ----------|---------|----------|---------|---------|
 */
export function parseMochaCoverage(stdout: string): Coverage {
  const lines = stdout.split("\n");
  const files: Coverage["files"] = [];
  let summary = { lines: 0, branches: 0, functions: 0 };

  for (const line of lines) {
    const match = line.match(
      /\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/,
    );
    if (!match) continue;

    const [, name, , branch, funcs, linePct] = match;
    const trimName = name.trim();

    if (trimName === "File" || trimName.match(/^-+$/)) continue;

    const entry = {
      lines: parseFloat(linePct),
      branches: parseFloat(branch),
      functions: parseFloat(funcs),
    };

    if (trimName === "All files") {
      summary = entry;
    } else {
      files.push({ file: trimName, ...entry });
    }
  }

  return {
    framework: "mocha",
    summary,
    files,
  };
}
