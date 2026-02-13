import { describe, it, expect } from "vitest";
import {
  formatTestRun,
  formatCoverage,
  compactTestRunMap,
  formatTestRunCompact,
  compactCoverageMap,
  formatCoverageCompact,
} from "../src/lib/formatters.js";
import type { TestRun, Coverage } from "../src/schemas/index.js";

describe("formatTestRun", () => {
  it("formats passing run", () => {
    const run: TestRun = {
      framework: "pytest",
      summary: { total: 12, passed: 12, failed: 0, skipped: 0, duration: 0.47 },
      failures: [],
    };
    const output = formatTestRun(run);

    expect(output).toContain("PASS");
    expect(output).toContain("12 tests");
    expect(output).toContain("12 passed");
    expect(output).toContain("0 failed");
    expect(output).toContain("0.47s");
  });

  it("formats failing run with failure details", () => {
    const run: TestRun = {
      framework: "jest",
      summary: { total: 8, passed: 6, failed: 2, skipped: 0, duration: 1.5 },
      failures: [
        {
          name: "should validate email",
          file: "api.test.ts",
          line: 15,
          message: "Expected valid@email.com",
        },
        { name: "should parse config", file: "utils.test.ts", message: "Received null" },
      ],
    };
    const output = formatTestRun(run);

    expect(output).toContain("FAIL");
    expect(output).toContain("8 tests");
    expect(output).toContain("2 failed");
    expect(output).toContain("should validate email");
    expect(output).toContain("api.test.ts:15");
    expect(output).toContain("should parse config");
  });

  it("formats run with large failure array (10+ failures)", () => {
    const failures: TestRun["failures"] = [];
    for (let i = 1; i <= 12; i++) {
      failures.push({
        name: `test case ${i}`,
        file: `suite${i}.test.ts`,
        line: i * 10,
        message: `Error in test ${i}`,
      });
    }
    const run: TestRun = {
      framework: "vitest",
      summary: { total: 50, passed: 38, failed: 12, skipped: 0, duration: 5.2 },
      failures,
    };
    const output = formatTestRun(run);

    expect(output).toContain("FAIL");
    expect(output).toContain("50 tests");
    expect(output).toContain("12 failed");
    // All 12 failures should appear
    for (let i = 1; i <= 12; i++) {
      expect(output).toContain(`test case ${i}`);
      expect(output).toContain(`suite${i}.test.ts:${i * 10}`);
    }
  });

  it("formats run with zero duration", () => {
    const run: TestRun = {
      framework: "mocha",
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, duration: 0 },
      failures: [],
    };
    const output = formatTestRun(run);

    expect(output).toContain("PASS");
    expect(output).toContain("0s");
  });

  it("formats failures with missing optional fields (no file/line)", () => {
    const run: TestRun = {
      framework: "jest",
      summary: { total: 3, passed: 1, failed: 2, skipped: 0, duration: 0.5 },
      failures: [
        { name: "anonymous test 1", message: "Something broke" },
        { name: "anonymous test 2", message: "Another error" },
      ],
    };
    const output = formatTestRun(run);

    expect(output).toContain("FAIL");
    expect(output).toContain("anonymous test 1");
    expect(output).toContain("Something broke");
    expect(output).toContain("anonymous test 2");
    // Should not have file:line notation
    expect(output).not.toContain("undefined");
  });

  it("formats run with very long test names", () => {
    const longName =
      "deeply nested describe > inner describe > should handle a very specific edge case when the input is extremely long and contains special characters like quotes and brackets";
    const run: TestRun = {
      framework: "vitest",
      summary: { total: 1, passed: 0, failed: 1, skipped: 0, duration: 0.1 },
      failures: [{ name: longName, file: "edge.test.ts", line: 99, message: "Timeout" }],
    };
    const output = formatTestRun(run);

    expect(output).toContain(longName);
    expect(output).toContain("edge.test.ts:99");
  });

  it("formats all-skip results (0 passed, 0 failed, N skipped)", () => {
    const run: TestRun = {
      framework: "pytest",
      summary: { total: 5, passed: 0, failed: 0, skipped: 5, duration: 0.02 },
      failures: [],
    };
    const output = formatTestRun(run);

    expect(output).toContain("PASS");
    expect(output).toContain("5 tests");
    expect(output).toContain("0 passed");
    expect(output).toContain("0 failed");
    expect(output).toContain("5 skipped");
  });
});

describe("formatCoverage", () => {
  it("formats coverage summary", () => {
    const cov: Coverage = {
      framework: "pytest",
      summary: { lines: 88 },
      files: [
        { file: "src/auth.py", lines: 92 },
        { file: "src/api.py", lines: 80 },
      ],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("88% lines");
    expect(output).toContain("src/auth.py: 92% lines");
    expect(output).toContain("src/api.py: 80% lines");
  });

  it("formats coverage with branches and functions", () => {
    const cov: Coverage = {
      framework: "jest",
      summary: { lines: 87.5, branches: 66.67, functions: 100 },
      files: [],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("87.5% lines");
    expect(output).toContain("66.67% branches");
    expect(output).toContain("100% functions");
  });

  it("formats 0% coverage", () => {
    const cov: Coverage = {
      framework: "mocha",
      summary: { lines: 0, branches: 0, functions: 0 },
      files: [{ file: "empty.js", lines: 0, branches: 0, functions: 0 }],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("0% lines");
    expect(output).toContain("0% branches");
    expect(output).toContain("0% functions");
    expect(output).toContain("empty.js: 0% lines");
  });

  it("formats 100% coverage", () => {
    const cov: Coverage = {
      framework: "vitest",
      summary: { lines: 100, branches: 100, functions: 100 },
      files: [{ file: "perfect.ts", lines: 100, branches: 100, functions: 100 }],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("100% lines");
    expect(output).toContain("100% branches");
    expect(output).toContain("100% functions");
    expect(output).toContain("perfect.ts: 100% lines");
  });

  it("formats coverage with undefined branches and functions", () => {
    const cov: Coverage = {
      framework: "pytest",
      summary: { lines: 75 },
      files: [{ file: "src/main.py", lines: 75 }],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("75% lines");
    // Should not contain branches or functions info
    expect(output).not.toContain("branches");
    expect(output).not.toContain("functions");
  });

  it("formats coverage with no files", () => {
    const cov: Coverage = {
      framework: "jest",
      summary: { lines: 0, branches: 0, functions: 0 },
      files: [],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("Coverage (jest)");
    expect(output).toContain("0% lines");
    // Output should be a single line (summary only, no file entries)
    expect(output.split("\n")).toHaveLength(1);
  });

  it("formats coverage with single file", () => {
    const cov: Coverage = {
      framework: "vitest",
      summary: { lines: 85.5, branches: 70, functions: 90 },
      files: [{ file: "index.ts", lines: 85.5, branches: 70, functions: 90 }],
    };
    const output = formatCoverage(cov);

    expect(output).toContain("85.5% lines");
    expect(output).toContain("index.ts: 85.5% lines");
    expect(output.split("\n")).toHaveLength(2);
  });
});

describe("compactTestRunMap", () => {
  it("keeps summary, framework, failure names and messages (drops stacks, locations, expected/actual)", () => {
    const run: TestRun = {
      framework: "jest",
      summary: { total: 10, passed: 7, failed: 3, skipped: 0, duration: 2.1 },
      failures: [
        {
          name: "should validate email",
          file: "api.test.ts",
          line: 15,
          message: "Expected valid@email.com to be valid",
          stack: "Error: Expected valid@email.com...\n    at Object.<anonymous> (api.test.ts:15)",
          expected: "true",
          actual: "false",
        },
        {
          name: "should parse config",
          file: "utils.test.ts",
          message: "Received null instead of config object",
        },
        {
          name: "should handle timeout",
          message: "Timeout after 5000ms",
        },
      ],
    };

    const compact = compactTestRunMap(run);

    expect(compact.framework).toBe("jest");
    expect(compact.summary).toEqual({
      total: 10,
      passed: 7,
      failed: 3,
      skipped: 0,
      duration: 2.1,
    });
    expect(compact.failures).toEqual([
      { name: "should validate email", message: "Expected valid@email.com to be valid" },
      { name: "should parse config", message: "Received null instead of config object" },
      { name: "should handle timeout", message: "Timeout after 5000ms" },
    ]);
    // Verify message is preserved but verbose fields are stripped
    expect(compact.failures[0]).toHaveProperty("message");
    expect(compact.failures[0]).not.toHaveProperty("file");
    expect(compact.failures[0]).not.toHaveProperty("line");
    expect(compact.failures[0]).not.toHaveProperty("stack");
    expect(compact.failures[0]).not.toHaveProperty("expected");
    expect(compact.failures[0]).not.toHaveProperty("actual");
  });

  it("omits message when failure has no message", () => {
    const run: TestRun = {
      framework: "mocha",
      summary: { total: 1, passed: 0, failed: 1, skipped: 0, duration: 0.1 },
      failures: [{ name: "anonymous failure" }],
    };

    const compact = compactTestRunMap(run);

    expect(compact.failures).toEqual([{ name: "anonymous failure" }]);
    expect(compact.failures[0]).not.toHaveProperty("message");
  });

  it("returns empty failures for passing run", () => {
    const run: TestRun = {
      framework: "vitest",
      summary: { total: 5, passed: 5, failed: 0, skipped: 0, duration: 0.3 },
      failures: [],
    };

    const compact = compactTestRunMap(run);

    expect(compact.failures).toEqual([]);
    expect(compact.summary.failed).toBe(0);
  });
});

describe("formatTestRunCompact", () => {
  it("formats compact test run with failure names and messages", () => {
    const compact = {
      framework: "jest",
      summary: { total: 10, passed: 7, failed: 3, skipped: 0, duration: 2.1 },
      failures: [
        { name: "should validate email", message: "Expected true, got false" },
        { name: "should parse config", message: "Received null" },
        { name: "should handle timeout" },
      ],
    };

    const output = formatTestRunCompact(compact);

    expect(output).toContain("FAIL");
    expect(output).toContain("(jest)");
    expect(output).toContain("10 tests");
    expect(output).toContain("3 failed");
    expect(output).toContain("FAIL should validate email: Expected true, got false");
    expect(output).toContain("FAIL should parse config: Received null");
    expect(output).toContain("FAIL should handle timeout");
    // Failure without message should not have trailing colon
    expect(output).not.toContain("FAIL should handle timeout:");
    // Should NOT contain verbose failure details like file/stack
    expect(output).not.toContain("api.test.ts");
  });

  it("formats compact passing run as PASS with no failure lines", () => {
    const compact = {
      framework: "vitest",
      summary: { total: 5, passed: 5, failed: 0, skipped: 0, duration: 0.3 },
      failures: [] as Array<{ name: string; message?: string }>,
    };

    const output = formatTestRunCompact(compact);

    expect(output).toContain("PASS");
    expect(output.split("\n")).toHaveLength(1);
  });
});

describe("compactCoverageMap", () => {
  it("keeps summary and totalFiles, drops per-file details", () => {
    const cov: Coverage = {
      framework: "jest",
      summary: { lines: 87.5, branches: 66.67, functions: 100 },
      files: [
        { file: "src/auth.ts", lines: 92, branches: 80, functions: 100 },
        { file: "src/api.ts", lines: 80, branches: 50, functions: 100 },
        { file: "src/utils.ts", lines: 95, branches: 70, functions: 100 },
      ],
    };

    const compact = compactCoverageMap(cov);

    expect(compact.framework).toBe("jest");
    expect(compact.summary).toEqual({ lines: 87.5, branches: 66.67, functions: 100 });
    expect(compact.totalFiles).toBe(3);
    // Verify per-file details are not present
    expect(compact).not.toHaveProperty("files");
  });

  it("returns totalFiles 0 for empty files array", () => {
    const cov: Coverage = {
      framework: "pytest",
      summary: { lines: 0 },
      files: [],
    };

    const compact = compactCoverageMap(cov);

    expect(compact.totalFiles).toBe(0);
  });

  it("preserves optional summary fields when present", () => {
    const cov: Coverage = {
      framework: "mocha",
      summary: { lines: 50 },
      files: [{ file: "app.js", lines: 50 }],
    };

    const compact = compactCoverageMap(cov);

    expect(compact.summary.lines).toBe(50);
    expect(compact.summary.branches).toBeUndefined();
    expect(compact.summary.functions).toBeUndefined();
    expect(compact.totalFiles).toBe(1);
  });
});

describe("formatCoverageCompact", () => {
  it("formats compact coverage with summary and file count", () => {
    const compact = {
      framework: "jest",
      summary: { lines: 87.5, branches: 66.67, functions: 100 },
      totalFiles: 3,
    };

    const output = formatCoverageCompact(compact);

    expect(output).toContain("Coverage (jest)");
    expect(output).toContain("87.5% lines");
    expect(output).toContain("66.67% branches");
    expect(output).toContain("100% functions");
    expect(output).toContain("3 file(s) analyzed");
    // Should NOT contain per-file details
    expect(output).not.toContain("src/auth.ts");
  });

  it("formats compact coverage without optional branches/functions", () => {
    const compact = {
      framework: "pytest",
      summary: { lines: 75 },
      totalFiles: 5,
    };

    const output = formatCoverageCompact(compact);

    expect(output).toContain("75% lines");
    expect(output).toContain("5 file(s) analyzed");
    expect(output).not.toContain("branches");
    expect(output).not.toContain("functions");
  });

  it("formats compact coverage with zero files", () => {
    const compact = {
      framework: "mocha",
      summary: { lines: 0, branches: 0, functions: 0 },
      totalFiles: 0,
    };

    const output = formatCoverageCompact(compact);

    expect(output).toContain("0% lines");
    expect(output).toContain("0 file(s) analyzed");
  });
});
