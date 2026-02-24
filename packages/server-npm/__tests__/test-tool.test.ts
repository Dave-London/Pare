import { describe, it, expect } from "vitest";
import { parseTestOutput } from "../src/lib/parsers.js";
import { formatTest } from "../src/lib/formatters.js";
import type { NpmTest } from "../src/schemas/index.js";

describe("parseTestOutput", () => {
  it("parses successful test output", () => {
    const result = parseTestOutput(0, "Tests: 42 passed, 42 total\nTime: 3.5s", "", 3.5);

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain("42 passed");
    expect(result.stderr).toBe("");
    // duration was removed from structured output
  });

  it("parses failed test output", () => {
    const result = parseTestOutput(
      1,
      "Tests: 3 failed, 39 passed, 42 total",
      "FAIL src/index.test.ts\n  Expected: true\n  Received: false",
      4.2,
    );

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain("3 failed");
    expect(result.stderr).toContain("FAIL");
    // duration was removed from structured output
  });

  it("handles no test script defined", () => {
    const result = parseTestOutput(
      1,
      "",
      'npm error Missing script: "test"\nnpm error\nnpm error To see a list of scripts, run:\nnpm error   npm run',
      0.3,
    );

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("Missing script");
    expect(result.stdout).toBe("");
  });

  it("trims whitespace from output", () => {
    const result = parseTestOutput(0, "\n  All tests passed  \n\n", "\n", 1.0);

    expect(result.stdout).toBe("All tests passed");
    expect(result.stderr).toBe("");
  });

  it("handles test with coverage output in stderr", () => {
    const result = parseTestOutput(
      0,
      "Tests: 10 passed\nStatements: 95%",
      "Warning: experimental coverage feature",
      2.1,
    );

    expect(result.success).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain("10 passed");
    expect(result.stderr).toContain("experimental coverage");
  });

  it("handles exit code other than 0 or 1", () => {
    const result = parseTestOutput(2, "", "SIGTERM", 60.0);

    expect(result.exitCode).toBe(2);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
  });
});

describe("formatTest", () => {
  it("formats passing tests", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "Tests: 42 passed",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatTest(data, 3.5);
    expect(output).toContain("Tests passed in 3.5s");
    expect(output).toContain("stdout:");
    expect(output).toContain("42 passed");
    expect(output).not.toContain("stderr:");
  });

  it("formats failing tests", () => {
    const data: NpmTest = {
      exitCode: 1,
      stdout: "Tests: 1 failed",
      stderr: "AssertionError: expected true to be false",
      success: false,
      timedOut: false,
    };
    const output = formatTest(data, 4.2);
    expect(output).toContain("Tests failed (exit code 1) in 4.2s");
    expect(output).toContain("stderr:");
    expect(output).toContain("AssertionError");
  });

  it("formats test with no output", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatTest(data, 0.5);
    expect(output).toBe("Tests passed in 0.5s");
  });

  it("formats test with both stdout and stderr", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "All tests passed",
      stderr: "Deprecation warning",
      success: true,
      timedOut: false,
    };
    const output = formatTest(data, 2.0);
    expect(output).toContain("stdout:");
    expect(output).toContain("stderr:");
  });
});

// ─── Error path tests ────────────────────────────────────────────────────────

describe("parseTestOutput error paths", () => {
  it("handles permission error", () => {
    const result = parseTestOutput(
      1,
      "",
      "Error: EACCES: permission denied, open '/tmp/test-results.json'",
      0.5,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("EACCES");
    expect(result.stderr).toContain("permission denied");
  });

  it("handles timeout scenario (empty output, non-zero exit)", () => {
    const result = parseTestOutput(1, "", "", 300.0);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    // duration was removed from structured output
  });

  it("handles signal termination (SIGTERM)", () => {
    const result = parseTestOutput(143, "Running tests...", "SIGTERM", 60.0);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(143);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toBe("SIGTERM");
  });

  it("handles out-of-memory crash", () => {
    const result = parseTestOutput(
      134,
      "",
      "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory",
      45.0,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(134);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("heap limit");
    expect(result.stderr).toContain("out of memory");
  });

  it("marks timedOut true when explicitly passed", () => {
    const result = parseTestOutput(124, "", "Command timed out", 300.0, true);
    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
  });
});
