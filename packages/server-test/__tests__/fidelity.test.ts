/**
 * Fidelity tests: verify that Pare's test runner parsers preserve all
 * meaningful information from raw test output.
 *
 * Runs real vitest commands on the Pare repo and compares raw JSON
 * against structured output to ensure no test results are lost.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { parseVitestJson, parseVitestCoverage } from "../src/lib/parsers/vitest.js";

const GIT_PKG = process.cwd().replace(/packages[\\/]server-test$/, "packages/server-git");

function runRaw(cmd: string, args: string[], cwd: string): string {
  try {
    return execFileSync(cmd, args, {
      cwd,
      encoding: "utf-8",
      shell: process.platform === "win32",
      timeout: 30_000,
    });
  } catch (e: unknown) {
    // vitest --reporter=json writes JSON to stdout even on test failure
    return (e as { stdout?: string }).stdout ?? "";
  }
}

describe("fidelity: vitest run", () => {
  it("preserves every test result from raw JSON", () => {
    const rawJson = runRaw("npx", ["vitest", "run", "--reporter=json"], GIT_PKG);

    // Extract the JSON portion
    const jsonStart = rawJson.indexOf("{");
    const jsonEnd = rawJson.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return;

    const jsonStr = rawJson.slice(jsonStart, jsonEnd + 1);
    const rawData = JSON.parse(jsonStr);

    const parsed = parseVitestJson(jsonStr);

    // Total test count must match
    expect(parsed.summary.total).toBe(rawData.numTotalTests);
    expect(parsed.summary.passed).toBe(rawData.numPassedTests);
    expect(parsed.summary.failed).toBe(rawData.numFailedTests);
    expect(parsed.summary.skipped).toBe(rawData.numPendingTests + (rawData.numTodoTests ?? 0));
  });

  it("every failed test from raw JSON appears in failures array", () => {
    const rawJson = runRaw("npx", ["vitest", "run", "--reporter=json"], GIT_PKG);

    const jsonStart = rawJson.indexOf("{");
    const jsonEnd = rawJson.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return;

    const jsonStr = rawJson.slice(jsonStart, jsonEnd + 1);
    const rawData = JSON.parse(jsonStr);

    const parsed = parseVitestJson(jsonStr);

    // Collect all failed tests from raw data
    const rawFailures: string[] = [];
    for (const suite of rawData.testResults) {
      for (const test of suite.assertionResults) {
        if (test.status === "failed") {
          rawFailures.push(test.fullName);
        }
      }
    }

    // Every raw failure must be in the parsed output
    expect(parsed.failures.length).toBe(rawFailures.length);
    for (const name of rawFailures) {
      const found = parsed.failures.some((f) => f.name === name);
      expect(found).toBe(true);
    }
  });

  it("test framework is correctly identified", () => {
    const rawJson = runRaw("npx", ["vitest", "run", "--reporter=json"], GIT_PKG);

    const jsonStart = rawJson.indexOf("{");
    const jsonEnd = rawJson.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return;

    const jsonStr = rawJson.slice(jsonStart, jsonEnd + 1);
    const parsed = parseVitestJson(jsonStr);

    expect(parsed.framework).toBe("vitest");
  });
});

describe("fidelity: vitest coverage", () => {
  it("preserves coverage percentages from raw text output", () => {
    const rawOutput = runRaw(
      "npx",
      ["vitest", "run", "--coverage", "--coverage.reporter=text"],
      GIT_PKG,
    );

    const parsed = parseVitestCoverage(rawOutput);

    // Check that coverage table was found (has summary or files)
    if (rawOutput.includes("All files")) {
      expect(parsed.summary.lines).toBeGreaterThanOrEqual(0);
      expect(parsed.summary.lines).toBeLessThanOrEqual(100);
      expect(parsed.summary.branches).toBeGreaterThanOrEqual(0);
      expect(parsed.summary.functions).toBeGreaterThanOrEqual(0);
    }

    // Every file in parsed output should have valid coverage ranges
    for (const file of parsed.files) {
      expect(file.lines).toBeGreaterThanOrEqual(0);
      expect(file.lines).toBeLessThanOrEqual(100);
      expect(file.branches).toBeGreaterThanOrEqual(0);
      expect(file.branches).toBeLessThanOrEqual(100);
      expect(file.functions).toBeGreaterThanOrEqual(0);
      expect(file.functions).toBeLessThanOrEqual(100);
    }
  });

  it("every file in coverage table appears in structured output", () => {
    const rawOutput = runRaw(
      "npx",
      ["vitest", "run", "--coverage", "--coverage.reporter=text"],
      GIT_PKG,
    );

    const parsed = parseVitestCoverage(rawOutput);

    // Extract file names from raw coverage table manually
    const lines = rawOutput.split("\n");
    const rawFiles: string[] = [];
    for (const line of lines) {
      const match = line.match(
        /\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/,
      );
      if (!match) continue;
      const name = match[1].trim();
      if (name === "File" || name.match(/^-+$/) || name === "All files") continue;
      rawFiles.push(name);
    }

    // Every file from raw table must be in structured output
    expect(parsed.files.length).toBe(rawFiles.length);
    for (const rawFile of rawFiles) {
      const found = parsed.files.some((f) => f.file === rawFile);
      expect(found).toBe(true);
    }
  });
});

describe("fidelity: parser edge cases", () => {
  it("parseVitestJson handles all-pass scenario (no failures)", () => {
    const input = JSON.stringify({
      numTotalTests: 5,
      numPassedTests: 5,
      numFailedTests: 0,
      numPendingTests: 0,
      startTime: Date.now() - 1000,
      success: true,
      testResults: [
        {
          name: "test.ts",
          assertionResults: [
            { fullName: "test 1", status: "passed", failureMessages: [] },
            { fullName: "test 2", status: "passed", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.summary.total).toBe(5);
    expect(parsed.summary.passed).toBe(5);
    expect(parsed.failures).toHaveLength(0);
  });

  it("parseVitestJson preserves failure messages", () => {
    const failureMsg = "Expected true to be false\n\nExpected: false\nReceived: true";
    const input = JSON.stringify({
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: Date.now() - 1000,
      success: false,
      testResults: [
        {
          name: "test.ts",
          assertionResults: [
            {
              fullName: "should fail",
              status: "failed",
              failureMessages: [failureMsg],
              location: { line: 10, column: 5 },
            },
          ],
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.failures).toHaveLength(1);
    expect(parsed.failures[0].name).toBe("should fail");
    expect(parsed.failures[0].file).toBe("test.ts");
    expect(parsed.failures[0].line).toBe(10);
    expect(parsed.failures[0].stack).toContain("Expected true to be false");
  });

  it("parseVitestCoverage handles empty output", () => {
    const parsed = parseVitestCoverage("");
    expect(parsed.files).toHaveLength(0);
    expect(parsed.summary.lines).toBe(0);
  });
});
