import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseJestJson,
  parseJestCoverage,
  parseJestCoverageJson,
} from "../src/lib/parsers/jest.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

// Fixtures are real `jest --json` output from Jest 29.7 (#1176), paths scrubbed.
describe("parseJestJson", () => {
  it("parses a passing run", () => {
    const result = parseJestJson(fixture("jest-json-pass.json"));

    expect(result.framework).toBe("jest");
    expect(result.summary).toMatchObject({ total: 3, passed: 2, failed: 0, skipped: 1 });
    expect(result.summary.duration).toBeGreaterThanOrEqual(0);
    expect(result.summary.duration).toBeLessThan(60);
    expect(result.failures).toEqual([]);
    expect(result.tests?.map((t) => [t.name, t.status])).toEqual([
      ["math adds", "passed"],
      ["math later", "skipped"],
      ["top level", "passed"],
    ]);
    expect(result.tests?.[0].file).toContain("math.test.js");
  });

  it("parses a failed assertion with expected and received", () => {
    const result = parseJestJson(fixture("jest-json-fail.json"));

    expect(result.summary).toMatchObject({ total: 5, passed: 3, failed: 1, skipped: 1 });
    expect(result.failures).toHaveLength(1);
    const [fail] = result.failures;
    expect(fail.name).toBe("math subtracts");
    expect(fail.file).toContain("math.test.js");
    expect(fail.message).toBe("Error: expect(received).toBe(expected) // Object.is equality");
    expect(fail.expected).toBe("1");
    expect(fail.actual).toBe("2");
    // Jest repeats the assertion output in the file's message; that is not a
    // second failure.
    expect(result.failures.some((f) => f.name.includes("suite-level"))).toBe(false);
  });

  it("reports a file that fails to run as a suite-level failure", () => {
    const result = parseJestJson(fixture("jest-json-load.json"));

    // Jest counts the broken file under numFailedTestSuites, not numFailedTests.
    expect(result.summary).toMatchObject({ total: 3, passed: 2, failed: 0, skipped: 1 });
    expect(result.failures).toEqual([
      {
        name: "broken.test.js (suite-level failure)",
        file: expect.stringContaining("broken.test.js"),
        message:
          "Cannot find module './does-not-exist' from 'broken.test.js' > 1 | require(\"./does-not-exist\");",
      },
    ]);
  });

  it("still reads the old testFilePath / testResults keys", () => {
    const legacy = JSON.stringify({
      success: false,
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: 0,
      testResults: [
        {
          testFilePath: "/p/a.test.ts",
          testResults: [{ fullName: "a fails", status: "failed", failureMessages: ["boom"] }],
        },
      ],
    });
    const result = parseJestJson(legacy);

    expect(result.failures).toEqual([
      {
        name: "a fails",
        file: "/p/a.test.ts",
        message: "boom",
        expected: undefined,
        actual: undefined,
      },
    ]);
  });
});

describe("parseJestCoverage", () => {
  it("parses text coverage output", () => {
    const result = parseJestCoverage(fixture("jest-coverage.txt"));

    expect(result.framework).toBe("jest");
    expect(result.summary.lines).toBe(87.5);
    expect(result.summary.statements).toBe(85.71);
    expect(result.summary.branches).toBe(66.67);
    expect(result.summary.functions).toBe(100);
    expect(result.files).toHaveLength(3);

    expect(result.files[0]).toEqual({
      file: "auth.ts",
      statements: 100,
      lines: 100,
      branches: 100,
      functions: 100,
    });
    expect(result.files[1].file).toBe("api.ts");
    expect(result.files[1].statements).toBe(71.43);
    expect(result.files[1].lines).toBe(75);
  });

  it("parses coverage-summary JSON", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 90 },
        lines: { pct: 91 },
        branches: { pct: 72 },
        functions: { pct: 95 },
      },
      "src/a.ts": {
        statements: { pct: 100 },
        lines: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
      },
    });
    const result = parseJestCoverageJson(json);
    expect(result.summary.statements).toBe(90);
    expect(result.summary.lines).toBe(91);
    expect(result.totalFiles).toBe(1);
    expect(result.files?.[0].statements).toBe(100);
  });
});
