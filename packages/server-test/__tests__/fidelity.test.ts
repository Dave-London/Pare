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
import { parseJestJson, parseJestCoverage } from "../src/lib/parsers/jest.js";
import { parsePytestOutput, parsePytestCoverage } from "../src/lib/parsers/pytest.js";

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

// ---------------------------------------------------------------------------
// Vitest expansion: skipped, todo, multi-line failures, large suites
// ---------------------------------------------------------------------------

describe("fidelity: vitest parser expansion", () => {
  it("counts skipped tests (status: pending)", () => {
    const input = JSON.stringify({
      numTotalTests: 4,
      numPassedTests: 2,
      numFailedTests: 0,
      numPendingTests: 2,
      startTime: Date.now() - 500,
      success: true,
      testResults: [
        {
          name: "skipped.test.ts",
          assertionResults: [
            { fullName: "works", status: "passed", failureMessages: [] },
            { fullName: "is skipped 1", status: "pending", failureMessages: [] },
            { fullName: "is skipped 2", status: "pending", failureMessages: [] },
            { fullName: "also works", status: "passed", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.summary.total).toBe(4);
    expect(parsed.summary.passed).toBe(2);
    expect(parsed.summary.skipped).toBe(2);
    expect(parsed.summary.failed).toBe(0);
    expect(parsed.failures).toHaveLength(0);
  });

  it("counts todo tests and combines with pending for skipped total", () => {
    const input = JSON.stringify({
      numTotalTests: 5,
      numPassedTests: 2,
      numFailedTests: 0,
      numPendingTests: 1,
      numTodoTests: 2,
      startTime: Date.now() - 500,
      success: true,
      testResults: [
        {
          name: "todo.test.ts",
          assertionResults: [
            { fullName: "works", status: "passed", failureMessages: [] },
            { fullName: "also works", status: "passed", failureMessages: [] },
            { fullName: "is pending", status: "pending", failureMessages: [] },
            { fullName: "todo 1", status: "todo", failureMessages: [] },
            { fullName: "todo 2", status: "todo", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.summary.total).toBe(5);
    expect(parsed.summary.passed).toBe(2);
    expect(parsed.summary.skipped).toBe(3); // 1 pending + 2 todo
    expect(parsed.summary.failed).toBe(0);
  });

  it("preserves multi-line failure messages and stack traces", () => {
    const multiLineStack = [
      "AssertionError: expected 42 to equal 99",
      "",
      "Expected: 99",
      "Received: 42",
      "",
      "    at Object.<anonymous> (src/math.test.ts:15:10)",
      "    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
      "    at runTest (node_modules/vitest/dist/runner.js:100:5)",
    ].join("\n");

    const input = JSON.stringify({
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: Date.now() - 200,
      success: false,
      testResults: [
        {
          name: "src/math.test.ts",
          assertionResults: [
            {
              fullName: "math > adds correctly",
              status: "failed",
              failureMessages: [multiLineStack],
              location: { line: 15, column: 10 },
            },
          ],
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.failures).toHaveLength(1);
    const fail = parsed.failures[0];
    expect(fail.stack).toContain("AssertionError: expected 42 to equal 99");
    expect(fail.stack).toContain("processTicksAndRejections");
    expect(fail.stack).toContain("runTest");
    // Verify entire multi-line stack is preserved, not truncated
    expect(fail.stack!.split("\n").length).toBeGreaterThanOrEqual(7);
    expect(fail.expected).toBe("99");
    expect(fail.actual).toBe("42");
  });

  it("handles a large test suite with 50+ tests accurately", () => {
    const assertions = [];
    for (let i = 1; i <= 55; i++) {
      assertions.push({
        fullName: `test case ${i}`,
        status: i <= 50 ? "passed" : "failed",
        failureMessages: i <= 50 ? [] : [`Error in test ${i}`],
        location: { line: i * 10, column: 1 },
      });
    }

    const input = JSON.stringify({
      numTotalTests: 55,
      numPassedTests: 50,
      numFailedTests: 5,
      numPendingTests: 0,
      startTime: Date.now() - 3000,
      success: false,
      testResults: [
        {
          name: "large-suite.test.ts",
          assertionResults: assertions,
        },
      ],
    });

    const parsed = parseVitestJson(input);
    expect(parsed.summary.total).toBe(55);
    expect(parsed.summary.passed).toBe(50);
    expect(parsed.summary.failed).toBe(5);
    expect(parsed.failures).toHaveLength(5);
    // Verify failure names are correct
    for (let i = 51; i <= 55; i++) {
      const found = parsed.failures.some((f) => f.name === `test case ${i}`);
      expect(found).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Jest: fixture-based parser tests
// ---------------------------------------------------------------------------

describe("fidelity: jest parser (fixture-based)", () => {
  it("parseJestJson handles all-pass scenario", () => {
    const input = JSON.stringify({
      success: true,
      numTotalTests: 4,
      numPassedTests: 4,
      numFailedTests: 0,
      numPendingTests: 0,
      startTime: Date.now() - 800,
      testResults: [
        {
          testFilePath: "/project/src/__tests__/utils.test.ts",
          testResults: [
            { fullName: "utils > add returns sum", status: "passed", failureMessages: [] },
            { fullName: "utils > subtract returns diff", status: "passed", failureMessages: [] },
          ],
        },
        {
          testFilePath: "/project/src/__tests__/helpers.test.ts",
          testResults: [
            { fullName: "helpers > format works", status: "passed", failureMessages: [] },
            { fullName: "helpers > parse works", status: "passed", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseJestJson(input);
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.total).toBe(4);
    expect(parsed.summary.passed).toBe(4);
    expect(parsed.summary.failed).toBe(0);
    expect(parsed.summary.skipped).toBe(0);
    expect(parsed.failures).toHaveLength(0);
  });

  it("parseJestJson captures failures with messages", () => {
    const failMsg =
      "expect(received).toBe(expected)\n\nExpected: 10\nReceived: 5\n\n    at Object.<anonymous> (src/math.test.ts:8:20)";

    const input = JSON.stringify({
      success: false,
      numTotalTests: 3,
      numPassedTests: 1,
      numFailedTests: 2,
      numPendingTests: 0,
      startTime: Date.now() - 600,
      testResults: [
        {
          testFilePath: "/project/src/math.test.ts",
          testResults: [
            { fullName: "math > adds correctly", status: "passed", failureMessages: [] },
            {
              fullName: "math > multiplies",
              status: "failed",
              failureMessages: [failMsg],
              location: { line: 8, column: 20 },
            },
            {
              fullName: "math > divides",
              status: "failed",
              failureMessages: ["TypeError: Cannot divide by zero"],
            },
          ],
        },
      ],
    });

    const parsed = parseJestJson(input);
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.total).toBe(3);
    expect(parsed.summary.passed).toBe(1);
    expect(parsed.summary.failed).toBe(2);
    expect(parsed.failures).toHaveLength(2);

    // First failure: has expected/actual and location
    const f1 = parsed.failures.find((f) => f.name === "math > multiplies")!;
    expect(f1).toBeDefined();
    expect(f1.file).toBe("/project/src/math.test.ts");
    expect(f1.line).toBe(8);
    expect(f1.expected).toBe("10");
    expect(f1.actual).toBe("5");
    expect(f1.stack).toContain("expect(received).toBe(expected)");

    // Second failure: no expected/actual, no location
    const f2 = parsed.failures.find((f) => f.name === "math > divides")!;
    expect(f2).toBeDefined();
    expect(f2.message).toBe("TypeError: Cannot divide by zero");
    expect(f2.line).toBeUndefined();
  });

  it("parseJestJson preserves test counts (total, passed, failed, skipped)", () => {
    const input = JSON.stringify({
      success: false,
      numTotalTests: 10,
      numPassedTests: 6,
      numFailedTests: 2,
      numPendingTests: 2,
      startTime: Date.now() - 2000,
      testResults: [
        {
          testFilePath: "/project/tests/suite.test.ts",
          testResults: [
            { fullName: "t1", status: "passed", failureMessages: [] },
            { fullName: "t2", status: "passed", failureMessages: [] },
            { fullName: "t3", status: "passed", failureMessages: [] },
            { fullName: "t4", status: "passed", failureMessages: [] },
            { fullName: "t5", status: "passed", failureMessages: [] },
            { fullName: "t6", status: "passed", failureMessages: [] },
            { fullName: "t7", status: "failed", failureMessages: ["Error A"] },
            { fullName: "t8", status: "failed", failureMessages: ["Error B"] },
            { fullName: "t9", status: "pending", failureMessages: [] },
            { fullName: "t10", status: "pending", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseJestJson(input);
    expect(parsed.summary.total).toBe(10);
    expect(parsed.summary.passed).toBe(6);
    expect(parsed.summary.failed).toBe(2);
    expect(parsed.summary.skipped).toBe(2);
    expect(parsed.failures).toHaveLength(2);
    expect(parsed.failures[0].name).toBe("t7");
    expect(parsed.failures[1].name).toBe("t8");
  });

  it("parseJestJson handles multiple test suites", () => {
    const input = JSON.stringify({
      success: true,
      numTotalTests: 6,
      numPassedTests: 5,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: Date.now() - 1500,
      testResults: [
        {
          testFilePath: "/project/src/a.test.ts",
          testResults: [
            { fullName: "a > test 1", status: "passed", failureMessages: [] },
            { fullName: "a > test 2", status: "passed", failureMessages: [] },
          ],
        },
        {
          testFilePath: "/project/src/b.test.ts",
          testResults: [
            { fullName: "b > test 1", status: "passed", failureMessages: [] },
            { fullName: "b > test 2", status: "failed", failureMessages: ["fail"] },
          ],
        },
        {
          testFilePath: "/project/src/c.test.ts",
          testResults: [
            { fullName: "c > test 1", status: "passed", failureMessages: [] },
            { fullName: "c > test 2", status: "passed", failureMessages: [] },
          ],
        },
      ],
    });

    const parsed = parseJestJson(input);
    expect(parsed.summary.total).toBe(6);
    expect(parsed.failures).toHaveLength(1);
    expect(parsed.failures[0].file).toBe("/project/src/b.test.ts");
  });
});

describe("fidelity: jest coverage parser (fixture-based)", () => {
  it("parseJestCoverage parses standard coverage table", () => {
    const coverageOutput = [
      "----------|---------|----------|---------|---------|-------------------",
      "File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s",
      "----------|---------|----------|---------|---------|-------------------",
      "All files |   87.50 |    75.00 |   90.00 |   85.00 |                  ",
      " foo.ts   |   90.00 |    80.00 |  100.00 |   88.00 | 12,15            ",
      " bar.ts   |   85.00 |    70.00 |   80.00 |   82.00 | 5-8              ",
      "----------|---------|----------|---------|---------|-------------------",
    ].join("\n");

    const parsed = parseJestCoverage(coverageOutput);
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.lines).toBe(85);
    expect(parsed.summary.branches).toBe(75);
    expect(parsed.summary.functions).toBe(90);
    expect(parsed.files).toHaveLength(2);

    const foo = parsed.files.find((f) => f.file === "foo.ts")!;
    expect(foo).toBeDefined();
    expect(foo.lines).toBe(88);
    expect(foo.branches).toBe(80);
    expect(foo.functions).toBe(100);

    const bar = parsed.files.find((f) => f.file === "bar.ts")!;
    expect(bar).toBeDefined();
    expect(bar.lines).toBe(82);
    expect(bar.branches).toBe(70);
    expect(bar.functions).toBe(80);
  });

  it("parseJestCoverage handles empty output", () => {
    const parsed = parseJestCoverage("");
    expect(parsed.framework).toBe("jest");
    expect(parsed.files).toHaveLength(0);
    expect(parsed.summary.lines).toBe(0);
  });

  it("parseJestCoverage handles single file coverage", () => {
    const coverageOutput = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |  100.00 |   100.00 |  100.00 |  100.00 |",
      " index.ts |  100.00 |   100.00 |  100.00 |  100.00 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const parsed = parseJestCoverage(coverageOutput);
    expect(parsed.summary.lines).toBe(100);
    expect(parsed.summary.branches).toBe(100);
    expect(parsed.summary.functions).toBe(100);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].file).toBe("index.ts");
    expect(parsed.files[0].lines).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Pytest: fixture-based parser tests
// ---------------------------------------------------------------------------

describe("fidelity: pytest parser (fixture-based)", () => {
  it("parsePytestOutput handles all-pass scenario", () => {
    const output = [
      "============================= test session starts ==============================",
      "collected 5 items",
      "",
      "tests/test_math.py::test_add PASSED",
      "tests/test_math.py::test_subtract PASSED",
      "tests/test_math.py::test_multiply PASSED",
      "tests/test_math.py::test_divide PASSED",
      "tests/test_math.py::test_modulo PASSED",
      "",
      "============================== 5 passed in 0.12s ==============================",
    ].join("\n");

    const parsed = parsePytestOutput(output);
    expect(parsed.framework).toBe("pytest");
    expect(parsed.summary.total).toBe(5);
    expect(parsed.summary.passed).toBe(5);
    expect(parsed.summary.failed).toBe(0);
    expect(parsed.summary.skipped).toBe(0);
    expect(parsed.summary.duration).toBeCloseTo(0.12);
    expect(parsed.failures).toHaveLength(0);
  });

  it("parsePytestOutput captures failures with messages from summary", () => {
    const output = [
      "============================= test session starts ==============================",
      "collected 3 items",
      "",
      "tests/test_calc.py::test_add PASSED",
      "tests/test_calc.py::test_div FAILED",
      "tests/test_calc.py::test_mul FAILED",
      "",
      "=========================== short test summary info ============================",
      "FAILED tests/test_calc.py::test_div - ZeroDivisionError: division by zero",
      "FAILED tests/test_calc.py::test_mul - AssertionError: assert 6 == 8",
      "========================= 2 failed, 1 passed in 0.35s =========================",
    ].join("\n");

    const parsed = parsePytestOutput(output);
    expect(parsed.framework).toBe("pytest");
    expect(parsed.summary.total).toBe(3);
    expect(parsed.summary.passed).toBe(1);
    expect(parsed.summary.failed).toBe(2);
    expect(parsed.summary.skipped).toBe(0);
    expect(parsed.summary.duration).toBeCloseTo(0.35);
    expect(parsed.failures).toHaveLength(2);

    const divFail = parsed.failures.find((f) => f.name === "test_div")!;
    expect(divFail).toBeDefined();
    expect(divFail.file).toBe("tests/test_calc.py");
    expect(divFail.message).toBe("ZeroDivisionError: division by zero");

    const mulFail = parsed.failures.find((f) => f.name === "test_mul")!;
    expect(mulFail).toBeDefined();
    expect(mulFail.file).toBe("tests/test_calc.py");
    expect(mulFail.message).toBe("AssertionError: assert 6 == 8");
  });

  it("parsePytestOutput preserves test counts (passed, failed, skipped)", () => {
    const output = [
      "============================= test session starts ==============================",
      "collected 8 items",
      "",
      "tests/test_app.py::test_a PASSED",
      "tests/test_app.py::test_b PASSED",
      "tests/test_app.py::test_c PASSED",
      "tests/test_app.py::test_d SKIPPED",
      "tests/test_app.py::test_e SKIPPED",
      "tests/test_app.py::test_f FAILED",
      "tests/test_app.py::test_g PASSED",
      "tests/test_app.py::test_h PASSED",
      "",
      "=========================== short test summary info ============================",
      "FAILED tests/test_app.py::test_f - ValueError: invalid input",
      "================= 1 failed, 5 passed, 2 skipped in 1.23s =================",
    ].join("\n");

    const parsed = parsePytestOutput(output);
    expect(parsed.summary.total).toBe(8);
    expect(parsed.summary.passed).toBe(5);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.summary.skipped).toBe(2);
    expect(parsed.summary.duration).toBeCloseTo(1.23);
    expect(parsed.failures).toHaveLength(1);
    expect(parsed.failures[0].name).toBe("test_f");
  });

  it("parsePytestOutput falls back to verbose FAILED lines when no summary section", () => {
    // Some minimal pytest outputs may not include the short test summary section
    const output = [
      "============================= test session starts ==============================",
      "collected 2 items",
      "",
      "tests/test_quick.py::test_ok PASSED",
      "tests/test_quick.py::test_bad FAILED",
      "",
      "========================= 1 failed, 1 passed in 0.05s =========================",
    ].join("\n");

    const parsed = parsePytestOutput(output);
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.passed).toBe(1);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.failures).toHaveLength(1);
    expect(parsed.failures[0].file).toBe("tests/test_quick.py");
    expect(parsed.failures[0].name).toBe("test_bad");
  });

  it("parsePytestOutput handles only-skipped tests", () => {
    const output = [
      "============================= test session starts ==============================",
      "collected 3 items",
      "",
      "tests/test_skip.py::test_a SKIPPED",
      "tests/test_skip.py::test_b SKIPPED",
      "tests/test_skip.py::test_c SKIPPED",
      "",
      "============================== 3 skipped in 0.02s ==============================",
    ].join("\n");

    const parsed = parsePytestOutput(output);
    expect(parsed.summary.total).toBe(3);
    expect(parsed.summary.passed).toBe(0);
    expect(parsed.summary.failed).toBe(0);
    expect(parsed.summary.skipped).toBe(3);
    expect(parsed.failures).toHaveLength(0);
  });
});

describe("fidelity: pytest coverage parser (fixture-based)", () => {
  it("parsePytestCoverage parses standard coverage table", () => {
    const output = [
      "---------- coverage: platform linux, python 3.11.5 ----------",
      "Name                  Stmts   Miss  Cover",
      "-------------------------------------------",
      "src/foo.py               50      5    90%",
      "src/bar.py               30     10    67%",
      "src/baz.py               20      0   100%",
      "-------------------------------------------",
      "TOTAL                   100     15    85%",
    ].join("\n");

    const parsed = parsePytestCoverage(output);
    expect(parsed.framework).toBe("pytest");
    expect(parsed.summary.lines).toBe(85);
    expect(parsed.files).toHaveLength(3);

    const foo = parsed.files.find((f) => f.file === "src/foo.py")!;
    expect(foo).toBeDefined();
    expect(foo.lines).toBe(90);

    const bar = parsed.files.find((f) => f.file === "src/bar.py")!;
    expect(bar).toBeDefined();
    expect(bar.lines).toBe(67);

    const baz = parsed.files.find((f) => f.file === "src/baz.py")!;
    expect(baz).toBeDefined();
    expect(baz.lines).toBe(100);
  });

  it("parsePytestCoverage handles empty output", () => {
    const parsed = parsePytestCoverage("");
    expect(parsed.framework).toBe("pytest");
    expect(parsed.files).toHaveLength(0);
    expect(parsed.summary.lines).toBe(0);
  });
});
