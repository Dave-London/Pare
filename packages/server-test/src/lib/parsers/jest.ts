import type { TestRun, Coverage } from "../../schemas/index.js";

/**
 * Jest JSON reporter output structure (from `jest --json`).
 */
interface JestJsonOutput {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime: number;
  testResults: Array<{
    testFilePath: string;
    testResults: Array<{
      fullName: string;
      status: "passed" | "failed" | "pending";
      failureMessages: string[];
      location?: { line: number; column: number };
    }>;
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

/**
 * Parses Jest JSON output (`jest --json`) into structured data.
 */
export function parseJestJson(jsonStr: string): TestRun {
  const data = JSON.parse(jsonStr) as JestJsonOutput;

  const endTime = Date.now();
  const duration = (endTime - data.startTime) / 1000;

  const failures: TestRun["failures"] = [];

  for (const suite of data.testResults) {
    for (const test of suite.testResults) {
      if (test.status === "failed") {
        const message = test.failureMessages.join("\n").trim();

        // Try to extract expected/actual from Jest's diff output
        const expectedMatch = message.match(/Expected[:\s]+(.+)/);
        const actualMatch = message.match(/Received[:\s]+(.+)/);

        failures.push({
          name: test.fullName,
          file: suite.testFilePath,
          line: test.location?.line,
          message: message.split("\n")[0] || "Test failed",
          expected: expectedMatch?.[1]?.trim(),
          actual: actualMatch?.[1]?.trim(),
          stack: message,
        });
      }
    }
  }

  return {
    framework: "jest",
    summary: {
      total: data.numTotalTests,
      passed: data.numPassedTests,
      failed: data.numFailedTests,
      skipped: data.numPendingTests,
      duration: Math.round(duration * 100) / 100,
    },
    failures,
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
  let summary = { lines: 0, branches: 0, functions: 0 };

  for (const line of lines) {
    // Match coverage table rows: " file | stmts | branch | funcs | lines | uncovered"
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
    framework: "jest",
    summary,
    files,
  };
}
