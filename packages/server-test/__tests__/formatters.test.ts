import { describe, it, expect } from "vitest";
import { formatTestRun, formatCoverage } from "../src/lib/formatters.js";
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
});
