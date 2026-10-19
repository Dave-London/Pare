import { stripAnsi } from "@paretools/shared";
import type { TestRun, Coverage } from "../../schemas/index.js";

interface JestAssertion {
  fullName: string;
  status: "passed" | "failed" | "pending" | "todo" | "skipped" | "disabled" | "focused";
  failureMessages: string[];
  duration?: number | null;
  location?: { line: number; column: number } | null;
}

/**
 * Jest JSON reporter output structure (from `jest --json`): one entry per test
 * file, with `name` and `assertionResults` (#1176). `testFilePath` and a nested
 * `testResults` belong to Jest's in-process AggregatedResult, not to the JSON it
 * writes; they are still read as a fallback.
 */
interface JestJsonOutput {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests?: number;
  startTime: number;
  testResults: Array<{
    name?: string;
    testFilePath?: string;
    /** File-level outcome. "failed" with no failed assertion means the file failed to run. */
    status?: string;
    /** File-level error text. Also repeats the assertion failures when a test failed. */
    message?: string;
    endTime?: number;
    assertionResults?: JestAssertion[];
    testResults?: JestAssertion[];
  }>;
  coverageMap?: Record<
    string,
    {
      path: string;
      statementMap: Record<string, unknown>;
      s: Record<string, number>;
      branchMap: Record<string, unknown>;
      b: Record<string, number[]>;
      fnMap: Record<string, unknown>;
      f: Record<string, number>;
    }
  >;
}

/** Marker in a failure's `name` for a file that failed outside any test. */
const SUITE_FAILURE_LABEL = "(suite-level failure)";

/**
 * Condenses Jest's file-level error ("  ● Test suite failed to run\n\n    Cannot
 * find module ...") to its first meaningful lines, without ANSI codes or the
 * "●" header.
 */
function summarizeSuiteMessage(message: string | undefined): string | undefined {
  const lines = stripAnsi(message ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("●"));
  if (lines.length === 0) return undefined;
  const text = lines.slice(0, 2).join(" ");
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/**
 * Parses Jest JSON output (`jest --json`) into structured data.
 */
export function parseJestJson(jsonStr: string): TestRun {
  const data = JSON.parse(jsonStr) as JestJsonOutput;

  // Each file reports its own endTime; fall back to "now" for older output.
  const endTimes = data.testResults.map((s) => s.endTime ?? 0).filter((t) => t > 0);
  const endTime = endTimes.length > 0 ? Math.max(...endTimes) : Date.now();
  const duration = Math.max(0, endTime - data.startTime) / 1000;

  const failures: TestRun["failures"] = [];
  const tests: NonNullable<TestRun["tests"]> = [];

  for (const suite of data.testResults) {
    const file = suite.name ?? suite.testFilePath ?? "";
    const assertions = suite.assertionResults ?? suite.testResults ?? [];

    for (const test of assertions) {
      tests.push({
        name: test.fullName,
        file,
        status:
          test.status === "failed" ? "failed" : test.status === "passed" ? "passed" : "skipped",
        ...(typeof test.duration === "number" ? { duration: test.duration / 1000 } : {}),
      });
      if (test.status === "failed") {
        const message = stripAnsi(test.failureMessages.join("\n")).trim();

        // Try to extract expected/actual from Jest's diff output
        const expectedMatch = message.match(/Expected[:\s]+(.+)/);
        const actualMatch = message.match(/Received[:\s]+(.+)/);

        failures.push({
          name: test.fullName,
          file,
          ...(test.location?.line !== undefined ? { line: test.location.line } : {}),
          message: message.split("\n")[0] || "Test failed",
          expected: expectedMatch?.[1]?.trim(),
          actual: actualMatch?.[1]?.trim(),
        });
      }
    }

    // A file that failed with no failed test failed to run (a missing module,
    // a syntax error). Jest counts it under numFailedTestSuites, not
    // numFailedTests, so without this the run would read as green. Unlike
    // Vitest, Jest also fills `message` when a test failed (it repeats the
    // assertion output), so the message alone is not a separate failure.
    const hasFailedTest = assertions.some((t) => t.status === "failed");
    if (suite.status === "failed" && !hasFailedTest) {
      const fileName = file.split(/[\\/]/).pop() || file;
      failures.push({
        // The compact view keeps only name and message, so the name carries the file.
        name: `${fileName} ${SUITE_FAILURE_LABEL}`,
        file,
        message: summarizeSuiteMessage(suite.message) ?? "Test suite failed to run",
      });
    }
  }

  return {
    framework: "jest",
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
 * Parses Jest text coverage summary output.
 *
 * Expected format:
 *   ----------|---------|----------|---------|---------|
 *   File      | % Stmts | % Branch | % Funcs | % Lines |
 *   ----------|---------|----------|---------|---------|
 *   All files |   85.71 |    66.67 |     100 |   85.71 |
 *    foo.ts   |   85.71 |    66.67 |     100 |   85.71 |
 *   ----------|---------|----------|---------|---------|
 */
export function parseJestCoverage(stdout: string): Coverage {
  const lines = stdout.split("\n");
  const files: Coverage["files"] = [];
  let summary = { statements: 0, lines: 0, branches: 0, functions: 0 };

  for (const line of lines) {
    // Match coverage table rows: " file | stmts | branch | funcs | lines | uncovered"
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
    framework: "jest",
    summary,
    files,
  };
}

/**
 * Parses Jest JSON summary coverage output (`coverage-summary.json`).
 */
export function parseJestCoverageJson(jsonStr: string): Coverage {
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
    framework: "jest",
    summary,
    files,
    totalFiles: files.length,
  };
}
