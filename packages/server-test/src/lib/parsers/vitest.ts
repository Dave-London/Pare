import type { TestRun, Coverage } from "../../schemas/index.js";

/**
 * Vitest JSON reporter output structure (from `vitest run --reporter=json`).
 */
interface VitestJsonOutput {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests?: number;
  startTime: number;
  success: boolean;
  testResults: Array<{
    name: string;
    assertionResults: Array<{
      fullName: string;
      status: "passed" | "failed" | "pending" | "todo";
      failureMessages: string[];
      duration?: number;
      location?: { line: number; column: number };
    }>;
  }>;
}

/**
 * Parses Vitest JSON output (`vitest run --reporter=json`) into structured data.
 * Vitest's JSON format is Jest-compatible, so the structure is very similar.
 */
export function parseVitestJson(jsonStr: string): TestRun {
  const data = JSON.parse(jsonStr) as VitestJsonOutput;

  const endTime = Date.now();
  const duration = (endTime - data.startTime) / 1000;

  const failures: TestRun["failures"] = [];
  const tests: NonNullable<TestRun["tests"]> = [];

  for (const suite of data.testResults) {
    for (const test of suite.assertionResults) {
      tests.push({
        name: test.fullName,
        file: suite.name,
        status:
          test.status === "failed" ? "failed" : test.status === "passed" ? "passed" : "skipped",
        ...(test.duration !== undefined ? { duration: test.duration / 1000 } : {}),
      });
      if (test.status === "failed") {
        const message = test.failureMessages.join("\n").trim();

        // Vitest uses similar assertion format to Jest
        const expectedMatch = message.match(/Expected[:\s]+(.+)/);
        const actualMatch = message.match(/Received[:\s]+(.+)/);

        failures.push({
          name: test.fullName,
          file: suite.name,
          line: test.location?.line,
          message: message.split("\n")[0] || "Test failed",
          expected: expectedMatch?.[1]?.trim(),
          actual: actualMatch?.[1]?.trim(),
        });
      }
    }
  }

  return {
    framework: "vitest",
    summary: {
      total: data.numTotalTests,
      passed: data.numPassedTests,
      failed: data.numFailedTests,
      skipped: data.numPendingTests + (data.numTodoTests ?? 0),
      duration: Math.round(duration * 100) / 100,
    },
    failures,
    ...(tests.length > 0 ? { tests } : {}),
  };
}

/**
 * Parses Vitest text coverage output (uses c8/istanbul format, same as Jest).
 */
export function parseVitestCoverage(stdout: string): Coverage {
  const lines = stdout.split("\n");
  const files: Coverage["files"] = [];
  let summary = { statements: 0, lines: 0, branches: 0, functions: 0 };

  for (const line of lines) {
    const match = line.match(
      /\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/,
    );
    if (!match) continue;

    const [, name, stmts, branch, funcs, linePct] = match;
    const trimName = name.trim();

    if (trimName === "File" || trimName.match(/^-+$/)) continue;

    const entry = {
      statements: parseFloat(stmts),
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
    framework: "vitest",
    summary,
    files,
  };
}

/**
 * Parses Vitest JSON summary coverage output (`coverage-summary.json`).
 */
export function parseVitestCoverageJson(jsonStr: string): Coverage {
  const parsed = JSON.parse(jsonStr) as Record<
    string,
    {
      statements?: { pct?: number };
      branches?: { pct?: number };
      functions?: { pct?: number };
      lines?: { pct?: number };
    }
  >;

  const files: Coverage["files"] = [];
  let summary = { statements: 0, lines: 0, branches: 0, functions: 0 };

  for (const [file, metrics] of Object.entries(parsed)) {
    const entry = {
      statements: metrics.statements?.pct ?? 0,
      lines: metrics.lines?.pct ?? 0,
      branches: metrics.branches?.pct ?? 0,
      functions: metrics.functions?.pct ?? 0,
    };
    if (file === "total") {
      summary = entry;
    } else {
      files.push({ file, ...entry });
    }
  }

  return {
    framework: "vitest",
    summary,
    files,
    totalFiles: files.length,
  };
}
