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

  for (const suite of data.testResults) {
    for (const test of suite.assertionResults) {
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
          stack: message,
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
  };
}

/**
 * Parses Vitest text coverage output (uses c8/istanbul format, same as Jest).
 */
export function parseVitestCoverage(stdout: string): Coverage {
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
    framework: "vitest",
    summary,
    files,
  };
}
