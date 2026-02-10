import { describe, it, expect } from "vitest";
import { parseTestOutput } from "../src/lib/parsers.js";
import { formatTest } from "../src/lib/formatters.js";
import type { NpmTest } from "../src/schemas/index.js";

describe("parseTestOutput", () => {
  it("parses successful test output", () => {
    const result = parseTestOutput(0, "Tests: 42 passed, 42 total\nTime: 3.5s", "", 3.5);

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("42 passed");
    expect(result.stderr).toBe("");
    expect(result.duration).toBe(3.5);
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
    expect(result.stdout).toContain("3 failed");
    expect(result.stderr).toContain("FAIL");
    expect(result.duration).toBe(4.2);
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
    expect(result.stdout).toContain("10 passed");
    expect(result.stderr).toContain("experimental coverage");
  });

  it("handles exit code other than 0 or 1", () => {
    const result = parseTestOutput(2, "", "SIGTERM", 60.0);

    expect(result.exitCode).toBe(2);
    expect(result.success).toBe(false);
  });
});

describe("formatTest", () => {
  it("formats passing tests", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "Tests: 42 passed",
      stderr: "",
      success: true,
      duration: 3.5,
    };
    const output = formatTest(data);
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
      duration: 4.2,
    };
    const output = formatTest(data);
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
      duration: 0.5,
    };
    const output = formatTest(data);
    expect(output).toBe("Tests passed in 0.5s");
  });

  it("formats test with both stdout and stderr", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "All tests passed",
      stderr: "Deprecation warning",
      success: true,
      duration: 2.0,
    };
    const output = formatTest(data);
    expect(output).toContain("stdout:");
    expect(output).toContain("stderr:");
  });
});
