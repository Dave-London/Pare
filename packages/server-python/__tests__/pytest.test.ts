import { describe, it, expect } from "vitest";
import { parsePytestOutput } from "../src/lib/parsers.js";
import { formatPytest } from "../src/lib/formatters.js";
import type { PytestResult } from "../src/schemas/index.js";

describe("parsePytestOutput", () => {
  it("parses all tests passing", () => {
    const stdout = ["....", "4 passed in 0.52s"].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
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
  });

  it("handles no tests collected", () => {
    const stdout = [
      "========================= no tests ran in 0.01s =========================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 5);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
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
  });

  // Real pytest output captured from a src-layout project missing PYTHONPATH=src
  // (pytest 8.x, --tb=short -q). See issue #984.
  const COLLECTION_ERROR_STDOUT = [
    "=================================== ERRORS ====================================",
    "_____________________ ERROR collecting tests/test_core.py _____________________",
    "ImportError while importing test module 'C:\\proj\\tests\\test_core.py'.",
    "Hint: make sure your test modules/packages have valid Python names.",
    "Traceback:",
    "C:\\Python313\\Lib\\importlib\\__init__.py:88: in import_module",
    "    return _bootstrap._gcd_import(name[level:], package, level)",
    "tests\\test_core.py:1: in <module>",
    "    from mypkg.core import add",
    "E   ModuleNotFoundError: No module named 'mypkg'",
    "=========================== short test summary info ===========================",
    "ERROR tests/test_core.py",
    "!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!",
    "1 error in 0.89s",
  ].join("\n");

  it("surfaces collection error diagnostics when no tests ran (issue #984)", () => {
    const result = parsePytestOutput(COLLECTION_ERROR_STDOUT, "", 2);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.exitCode).toBe(2);
    expect(result.errorOutput).toContain("ModuleNotFoundError: No module named 'mypkg'");
    expect(result.errorOutput).toContain("ERROR collecting tests/test_core.py");
  });

  it("surfaces startup crash diagnostics from stderr (broken plugin)", () => {
    // Real shape of a pytest startup crash: broken plugin import kills pytest
    // before any output reaches stdout; the traceback lands on stderr.
    const stderr = [
      "Traceback (most recent call last):",
      '  File "site-packages/pluggy/_manager.py", line 416, in load_setuptools_entrypoints',
      "    plugin = ep.load()",
      "ImportError: cannot import name 'ReadableLogRecord' from 'opentelemetry.sdk._logs'",
    ].join("\n");

    const result = parsePytestOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("ImportError: cannot import name 'ReadableLogRecord'");
  });

  it("prefers the stream carrying the error signal", () => {
    // Collection errors land on stdout even when stderr has unrelated warnings.
    const stderr = "UserWarning: some plugin warning\n  plugins = get_plugins()";

    const result = parsePytestOutput(COLLECTION_ERROR_STDOUT, stderr, 2);

    expect(result.errorOutput).toContain("ModuleNotFoundError");
    expect(result.errorOutput).not.toContain("UserWarning");
  });

  it("truncates long diagnostics keeping the tail", () => {
    const stdout = "x".repeat(10_000) + "\nModuleNotFoundError: No module named 'foo'";

    const result = parsePytestOutput(stdout, "", 2);

    expect(result.errorOutput).toMatch(/^… \(output truncated\)\n/);
    expect(result.errorOutput).toContain("ModuleNotFoundError: No module named 'foo'");
    expect(result.errorOutput!.length).toBeLessThanOrEqual(4_100);
  });

  it("does not attach diagnostics to successful runs", () => {
    const result = parsePytestOutput("....\n4 passed in 0.52s", "", 0);

    expect(result.errorOutput).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("does not attach diagnostics when no tests ran cleanly (exit 5)", () => {
    const result = parsePytestOutput("no tests ran in 0.01s", "", 5);

    expect(result.success).toBe(true);
    expect(result.errorOutput).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("does not attach diagnostics when tests actually failed", () => {
    const stdout = [
      "_____________________________ test_addition _____________________________",
      "E       assert 2 == 3",
      "==================== 2 passed, 1 failed in 1.23s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.failed).toBe(1);
    expect(result.errorOutput).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
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
      warnings: 0,
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
      warnings: 0,
      failures: [],
    };
    expect(formatPytest(data)).toBe("pytest: 10 passed");
  });

  it("formats mixed results with failures", () => {
    const data: PytestResult = {
      success: false,
      passed: 3,
      failed: 1,
      errors: 0,
      skipped: 2,
      warnings: 0,
      failures: [{ test: "test_thing", message: "assert 1 == 2" }],
    };
    const output = formatPytest(data);

    expect(output).toContain("3 passed, 1 failed, 2 skipped");
    expect(output).toContain("FAILED test_thing: assert 1 == 2");
  });

  it("formats failed run with no test results using exit code and diagnostics", () => {
    const data: PytestResult = {
      success: false,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failures: [],
      exitCode: 2,
      errorOutput: "ModuleNotFoundError: No module named 'mypkg'",
    };
    const output = formatPytest(data);

    expect(output).toContain("run failed with no test results (exit code 2)");
    expect(output).toContain("ModuleNotFoundError: No module named 'mypkg'");
  });

  it("appends diagnostics after counts when collection errors were counted", () => {
    const data: PytestResult = {
      success: false,
      passed: 0,
      failed: 0,
      errors: 1,
      skipped: 0,
      warnings: 0,
      failures: [{ test: "ERROR collecting tests/test_core.py", message: "ModuleNotFoundError" }],
      exitCode: 2,
      errorOutput: "E   ModuleNotFoundError: No module named 'mypkg'",
    };
    const output = formatPytest(data);

    expect(output).toContain("1 errors");
    expect(output).toContain("ModuleNotFoundError: No module named 'mypkg'");
  });
});

// Real shape of a run with Postgres-gated skips: the skip reason carries libpq's
// "port 5555 failed: Connection refused" text, which the old line-by-line
// scraper read as `failed: 5555`. See issues #1061 / #1045.
const PYTEST_SKIP_REASON_WITH_PORT = [
  "============================= test session starts =============================",
  "platform win32 -- Python 3.13.1, pytest-8.3.4, pluggy-1.5.0",
  "rootdir: C:\proj",
  "plugins: anyio-4.6.2, asyncio-0.24.0, cov-6.0.0",
  "collected 201 items",
  "",
  "tests/test_api.py ......................................          [ 25%]",
  "tests/test_db.py ssss                                             [ 27%]",
  "tests/test_engine.py ..................................           [100%]",
  "",
  "=========================== short test summary info ===========================",
  'SKIPPED [1] tests/test_db.py:12: postgres_only: connection to server at "localhost" (127.0.0.1), port 5555 failed: Connection refused',
  'SKIPPED [1] tests/test_db.py:20: postgres_only: connection to server at "localhost" (127.0.0.1), port 5555 failed: Connection refused',
  "SKIPPED [2] tests/conftest.py:88: requires Postgres on port 5555",
  "======================= 197 passed, 4 skipped in 12.34s =======================",
].join("\n");

describe("parsePytestOutput — counts come only from the summary line (#1061)", () => {
  it("ignores numbers in skip reasons instead of scraping them as failures", () => {
    const result = parsePytestOutput(PYTEST_SKIP_REASON_WITH_PORT, "", 0);

    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(197);
    expect(result.skipped).toBe(4);
    expect(result.failures).toEqual([]);
  });

  it("ignores a port number in a captured log line on stderr", () => {
    const stderr = [
      "WARNING  db.session:session.py:44 could not connect on port 5555 failed: Connection refused",
    ].join("\n");

    const result = parsePytestOutput("1465 passed, 12 skipped in 98.20s", stderr, 0);

    expect(result.failed).toBe(0);
    expect(result.passed).toBe(1465);
    expect(result.skipped).toBe(12);
    expect(result.success).toBe(true);
  });

  it("takes the last summary line when several are printed", () => {
    const stdout = [
      "==================== 1 failed, 1 passed in 0.50s ====================",
      "Rerunning failed tests…",
      "==================== 2 passed in 0.90s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });

  it("does not treat the short test summary header as a counts line", () => {
    const stdout = [
      "=========================== short test summary info ===========================",
      "SKIPPED [1] tests/test_db.py:12: needs 5555 error budget",
      "======================= 3 passed, 1 skipped in 0.42s =======================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.passed).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("reports zero rather than a fabricated count when no summary line exists", () => {
    const stdout = [
      "Connecting to fixture host…",
      "connection to server at localhost, port 5555 failed: Connection refused",
      "42 error budget exceeded",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("never reports success alongside failures", () => {
    // Defensive: a wrapper swallowing pytest's exit code must not flip the verdict.
    const result = parsePytestOutput("==== 1 failed, 2 passed in 0.30s ====", "", 0);

    expect(result.failed).toBe(1);
    expect(result.success).toBe(false);
  });

  it("still parses the undecorated summary line emitted by pytest -q", () => {
    const result = parsePytestOutput("....s\n4 passed, 1 skipped in 0.52s", "", 0);

    expect(result.passed).toBe(4);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("parses a summary line with an elapsed-time suffix", () => {
    const result = parsePytestOutput(
      "==== 120 passed, 3 skipped in 3612.10s (1:00:12) ====",
      "",
      0,
    );

    expect(result.passed).toBe(120);
    expect(result.skipped).toBe(3);
    expect(result.failed).toBe(0);
  });
});
