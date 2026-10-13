/**
 * Tests for the "silent green" guard: a test runner that exits non-zero but
 * reports zero tests (a load/collection failure, or a filter that matched
 * nothing) must NOT be reported as a passing run. See issues #928 and #931.
 */
import { describe, it, expect } from "vitest";
import { surfaceLoadFailure } from "../src/tools/run.js";
import type { TestRun } from "../src/schemas/index.js";

const zeroRun: TestRun = {
  framework: "vitest",
  summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
  failures: [],
};

describe("surfaceLoadFailure", () => {
  it("flags a suite that fails to load (non-zero exit, zero tests)", () => {
    const result = {
      exitCode: 1,
      stdout: "",
      stderr: "SyntaxError: Unexpected token in tests/broken.test.ts",
    };
    const flagged = surfaceLoadFailure(zeroRun, result);

    expect(flagged.error).toBeDefined();
    expect(flagged.error).toMatch(/exited with code 1/);
    expect(flagged.error).toMatch(/failed to load or collect/);
    // The stderr detail must be surfaced so the agent sees the real cause.
    expect(flagged.error).toContain("SyntaxError");
  });

  it("does NOT read as a pass — error field distinguishes it from green", () => {
    const flagged = surfaceLoadFailure(zeroRun, { exitCode: 1, stdout: "", stderr: "boom" });
    // Zero totals alone would read as PASS; the error field is what prevents that.
    expect(flagged.summary.total).toBe(0);
    expect(flagged.summary.failed).toBe(0);
    expect(flagged.error).toBeTruthy();
  });

  it("flags a filter that matched no tests (pytest exit code 5)", () => {
    const pytestRun: TestRun = { ...zeroRun, framework: "pytest" };
    const flagged = surfaceLoadFailure(pytestRun, {
      exitCode: 5,
      stdout: "no tests ran in 0.01s",
      stderr: "",
    });
    expect(flagged.error).toMatch(/exited with code 5/);
    // Falls back to stdout when stderr is empty.
    expect(flagged.error).toContain("no tests ran");
  });

  it("does not flag a clean run with zero tests but exit code 0 (passWithNoTests)", () => {
    const flagged = surfaceLoadFailure(zeroRun, { exitCode: 0, stdout: "", stderr: "" });
    expect(flagged.error).toBeUndefined();
    expect(flagged).toEqual(zeroRun);
  });

  it("does not flag a run that reported real tests (non-zero exit, tests present)", () => {
    const failingRun: TestRun = {
      framework: "vitest",
      summary: { total: 3, passed: 2, failed: 1, skipped: 0, duration: 0.5 },
      failures: [{ name: "does thing", message: "expected true" }],
    };
    const flagged = surfaceLoadFailure(failingRun, { exitCode: 1, stdout: "", stderr: "" });
    expect(flagged.error).toBeUndefined();
    expect(flagged).toEqual(failingRun);
  });

  it("flags a non-zero exit when tests ran but none was counted as failed (#1174)", () => {
    // What a throwing beforeAll looks like: its tests are skipped, nothing "failed".
    const hookFailure: TestRun = {
      framework: "vitest",
      summary: { total: 3, passed: 1, failed: 0, skipped: 2, duration: 0.2 },
      failures: [{ name: "a.test.ts (suite-level failure)", file: "/p/a.test.ts", message: "x" }],
    };
    const flagged = surfaceLoadFailure(hookFailure, { exitCode: 1, stdout: "", stderr: "" });

    expect(flagged.error).toMatch(/exited with code 1 but no test was reported as failed/);
    expect(flagged.error).toMatch(/suite hook/);
    expect(flagged.error).toMatch(/See `failures`/);
    expect(flagged.error).toMatch(/not a passing run/);
    // Counts and failures are left as the runner reported them.
    expect(flagged.summary).toEqual(hookFailure.summary);
    expect(flagged.failures).toEqual(hookFailure.failures);
  });

  it("flags a non-zero exit with all tests passing and no parsed failure (e.g. coverage threshold)", () => {
    const allGreen: TestRun = {
      framework: "jest",
      summary: { total: 5, passed: 5, failed: 0, skipped: 0, duration: 1 },
      failures: [],
    };
    const flagged = surfaceLoadFailure(allGreen, {
      exitCode: 1,
      stdout: "",
      stderr: 'Jest: "global" coverage threshold for lines (80%) not met: 61%',
    });

    expect(flagged.error).toMatch(/no test was reported as failed/);
    expect(flagged.error).not.toMatch(/See `failures`/);
    expect(flagged.error).toContain("coverage threshold for lines");
  });

  it("does not flag a passing run (exit 0 with tests)", () => {
    const passingRun: TestRun = {
      framework: "jest",
      summary: { total: 5, passed: 5, failed: 0, skipped: 0, duration: 1 },
      failures: [],
    };
    const flagged = surfaceLoadFailure(passingRun, { exitCode: 0, stdout: "", stderr: "" });
    expect(flagged.error).toBeUndefined();
  });

  it("truncates very long output detail", () => {
    const huge = "x".repeat(5000);
    const flagged = surfaceLoadFailure(zeroRun, { exitCode: 1, stdout: "", stderr: huge });
    expect(flagged.error).toContain("output truncated");
    expect(flagged.error!.length).toBeLessThan(huge.length);
  });
});
