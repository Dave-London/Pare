import { describe, it, expect } from "vitest";
import { parsePytestOutput } from "../src/lib/parsers.js";
import { formatPytest } from "../src/lib/formatters.js";
import type { PytestResult } from "../src/schemas/index.js";

describe("parsePytestOutput", () => {
  it("parses all tests passing", () => {
    const stdout = [
      "....",
      "4 passed in 0.52s",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(4);
    expect(result.duration).toBe(0.52);
    expect(result.failures).toEqual([]);
  });

  it("parses mixed results with failures", () => {
    const stdout = [
      "_____________________________ test_addition _____________________________",
      "",
      "    def test_addition():",
      ">       assert 1 + 1 == 3",
      "E       assert 2 == 3",
      "E        +  where 2 = 1 + 1",
      "",
      "test_math.py:5: AssertionError",
      "========================= short test summary info =========================",
      "FAILED test_math.py::test_addition",
      "==================== 2 passed, 1 failed in 1.23s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.total).toBe(3);
    expect(result.duration).toBe(1.23);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe("test_addition");
    expect(result.failures[0].message).toContain("assert 2 == 3");
  });

  it("parses results with errors and skips", () => {
    const stdout = [
      "========================= short test summary info =========================",
      "==================== 3 passed, 1 failed, 2 errors, 1 skipped in 2.50s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.errors).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(7);
    expect(result.duration).toBe(2.5);
  });

  it("handles no tests collected", () => {
    const stdout = [
      "========================= no tests ran in 0.01s =========================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 5);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("parses multiple failures", () => {
    const stdout = [
      "_____________________________ test_foo _____________________________",
      "",
      "    def test_foo():",
      ">       assert False",
      "E       assert False",
      "",
      "test_bar.py:3: AssertionError",
      "_____________________________ test_bar _____________________________",
      "",
      "    def test_bar():",
      ">       raise ValueError('bad')",
      "E       ValueError: bad",
      "",
      "test_bar.py:7: ValueError",
      "========================= short test summary info =========================",
      "==================== 0 passed, 2 failed in 0.10s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].test).toBe("test_foo");
    expect(result.failures[0].message).toContain("assert False");
    expect(result.failures[1].test).toBe("test_bar");
    expect(result.failures[1].message).toContain("ValueError: bad");
  });

  it("handles output on stderr", () => {
    const stderr = "========================= 5 passed in 0.30s =========================";

    const result = parsePytestOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(5);
    expect(result.total).toBe(5);
  });
});

describe("formatPytest", () => {
  it("formats no tests collected", () => {
    const data: PytestResult = {
      success: true,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      failures: [],
    };
    expect(formatPytest(data)).toBe("pytest: no tests collected.");
  });

  it("formats all passing", () => {
    const data: PytestResult = {
      success: true,
      passed: 10,
      failed: 0,
      errors: 0,
      skipped: 0,
      total: 10,
      duration: 1.5,
      failures: [],
    };
    expect(formatPytest(data)).toBe("pytest: 10 passed in 1.5s");
  });

  it("formats mixed results with failures", () => {
    const data: PytestResult = {
      success: false,
      passed: 3,
      failed: 1,
      errors: 0,
      skipped: 2,
      total: 6,
      duration: 2.0,
      failures: [{ test: "test_thing", message: "assert 1 == 2" }],
    };
    const output = formatPytest(data);

    expect(output).toContain("3 passed, 1 failed, 2 skipped in 2s");
    expect(output).toContain("FAILED test_thing: assert 1 == 2");
  });
});
