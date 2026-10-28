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
      "================================ FAILURES =================================",
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

  it("extracts failures from short test summary info when failure blocks are absent (#1222)", () => {
    const stdout = [
      "=========================== short test summary info ===========================",
      "FAILED tests/plumber/test_refusal_detail_6245.py::test_foo - AssertionError: assert 1 == 2",
      "FAILED tests/plumber/test_refusal_detail_6245.py::test_bar - AssertionError: assert 3 == 4",
      "============================== 2 failed in 0.12s ===============================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(2);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].test).toBe("tests/plumber/test_refusal_detail_6245.py::test_foo");
    expect(result.failures[0].message).toBe("AssertionError: assert 1 == 2");
    expect(result.failures[1].test).toBe("tests/plumber/test_refusal_detail_6245.py::test_bar");
    expect(result.failures[1].message).toBe("AssertionError: assert 3 == 4");
  });

  it("extracts ERROR items from short test summary info (#1222)", () => {
    const stdout = [
      "=========================== short test summary info ===========================",
      "ERROR tests/test_setup.py::test_crash - RuntimeError: out of memory",
      "============================== 1 error in 0.05s ===============================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.errors).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe("tests/test_setup.py::test_crash");
    expect(result.failures[0].message).toBe("RuntimeError: out of memory");
  });

  it("extracts failures with hyphens in path and parameterized IDs (#1222)", () => {
    const stdout = [
      "=========================== short test summary info ===========================",
      "FAILED tests/my-pkg/test_x.py::test_a[1-2] - AssertionError: mismatch",
      "FAILED tests/my-pkg/test_x.py::test_b[param-val] - ValueError: invalid input",
      "============================== 2 failed in 0.12s ===============================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(2);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].test).toBe("tests/my-pkg/test_x.py::test_a[1-2]");
    expect(result.failures[0].message).toBe("AssertionError: mismatch");
    expect(result.failures[1].test).toBe("tests/my-pkg/test_x.py::test_b[param-val]");
    expect(result.failures[1].message).toBe("ValueError: invalid input");
  });

  it("extracts failures without dash message and gets message from following E line (#1213/#1222)", () => {
    const stdout = [
      "=========================== short test summary info ===========================",
      "FAILED tests/api/test_rollback_refusal_5596.py::test_rollback_then_raise_keeps_its_documented_refusal[routes/admin_outreach.py::mint_outreach_tokens]",
      'E   AssertionError: {"error_code":"CONFLICT_001", "msg":"conflict"}',
      "============================== 1 failed in 0.05s ===============================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe(
      "tests/api/test_rollback_refusal_5596.py::test_rollback_then_raise_keeps_its_documented_refusal[routes/admin_outreach.py::mint_outreach_tokens]",
    );
    expect(result.failures[0].message).toBe('AssertionError: {"error_code":"CONFLICT_001", "msg":"conflict"}');
  });

  it("ignores failure-like lines outside short test summary info (#1222)", () => {
    const stdout = [
      "Captured stdout call:",
      "FAILED tests/fake.py::test_fake - not a real failure",
      "=========================== short test summary info ===========================",
      "FAILED tests/real.py::test_real - AssertionError: real error",
      "============================== 1 failed in 0.05s ===============================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe("tests/real.py::test_real");
    expect(result.failures[0].message).toBe("AssertionError: real error");
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
      "================================ FAILURES =================================",
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
      "================================ FAILURES =================================",
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

  it("does not say 'no tests collected' when the counts are merely unknown", () => {
    const data: PytestResult = {
      success: true,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failures: [],
      countsUnavailable: true,
      errorOutput: "....s  [100%]",
    };
    const text = formatPytest(data);

    expect(text).not.toContain("no tests collected");
    expect(text).toMatch(/^pytest: exited 0, but its summary line was not found/);
    expect(text).toContain("....s  [100%]");
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

  // Real pytest 9.1.1 output at two levels of quiet (`--tb=short -q -q`): the progress
  // line and the warnings section are there, the final "N passed" line is not.
  const PYTEST_QQ_NO_SUMMARY = [
    "....s                                                                    [100%]",
    "=============================== warnings summary ===============================",
    "tests/test_a.py::test_warn",
    "  /project/tests/test_a.py:5: UserWarning: careful",
    '    warnings.warn("careful", UserWarning)',
    "",
    "-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html",
  ].join("\n");

  it("flags a passing run whose summary line is missing instead of reporting clean zeros", () => {
    const result = parsePytestOutput(PYTEST_QQ_NO_SUMMARY, "", 0);

    // Exit 0 means pytest collected tests and none failed, so this is a pass...
    expect(result.success).toBe(true);
    // ...but the counts are unknown, and the result must say so (#1092, #1153).
    expect(result.countsUnavailable).toBe(true);
    expect(result).toMatchObject({ passed: 0, failed: 0, errors: 0, skipped: 0 });
    // The raw tail is kept so a custom summary is still visible to the caller.
    expect(result.errorOutput).toContain("[100%]");
  });

  it("does not flag counts as unavailable when the summary line is present", () => {
    const withSummary = `${PYTEST_QQ_NO_SUMMARY}\n4 passed, 1 skipped, 1 warning in 0.01s`;
    const result = parsePytestOutput(withSummary, "", 0);

    expect(result.countsUnavailable).toBeUndefined();
    expect(result).toMatchObject({ success: true, passed: 4, skipped: 1, warnings: 1 });
    expect(result.errorOutput).toBeUndefined();
  });

  it("does not flag counts as unavailable for collect-only or no-tests output", () => {
    // All real pytest 9.1.1 output. Nothing ran in any of these, so zeros are right.
    const cases: Array<[string, number]> = [
      // --collect-only at verbosity -1
      ["tests/test_a.py::test_one\ntests/test_a.py::test_two\n\n2 tests collected in 0.00s", 0],
      // --collect-only with -k, at verbosity -1 and (ruled) at verbosity 1
      ["tests/test_a.py::test_one\n\n1/5 tests collected (4 deselected) in 0.00s", 0],
      ["================= 1/5 tests collected (4 deselected) in 0.01s ==================", 0],
      // --collect-only with -k matching nothing, and a plain run with -k matching nothing
      ["\nno tests collected (5 deselected) in 0.00s", 5],
      ["\n5 deselected in 0.00s", 5],
    ];
    for (const [stdout, exitCode] of cases) {
      const result = parsePytestOutput(stdout, "", exitCode);
      expect(result.countsUnavailable, stdout).toBeUndefined();
      expect(result, stdout).toMatchObject({ passed: 0, failed: 0, errors: 0 });
    }
  });

  it("keeps parsed failure blocks when the summary line is missing on exit 0", () => {
    // Reachable with an exit-code-suppressing plugin plus a replaced summary: the
    // failure text is in the output even though nothing counts it.
    const stdout = [
      "================================ FAILURES =================================",
      "_____________________________ test_bad _____________________________",
      "    def test_bad():",
      ">       assert 1 == 2",
      "E       assert 1 == 2",
      "",
      "tests/test_fail.py:2: AssertionError",
    ].join("\n");
    const result = parsePytestOutput(stdout, "", 0);

    expect(result.countsUnavailable).toBe(true);
    expect(result.failures).toEqual([{ test: "test_bad", message: "assert 1 == 2" }]);
  });

  it("still flags unknown counts when the output merely mentions 'no tests ran'", () => {
    // pytest exits 5 when it ran nothing; exit 0 with this phrase in a log line is
    // still a run whose summary could not be read.
    const result = parsePytestOutput("....\nINFO retry: no tests ran yet, waiting", "", 0);

    expect(result.countsUnavailable).toBe(true);
  });

  it("scans a long line of summary-like tokens in linear time", () => {
    // Regression: when two alternatives of the count token both matched
    // "5 tests collected", a line of N such tokens with no duration took 2^N steps
    // (26 tokens: seconds; 40: hours). Any test can print such a line.
    // 24 tokens is deliberate: with the overlap it takes about a second, which fails
    // this assertion cleanly. A much longer line would hang inside the regex, where
    // the test timeout cannot interrupt it. The fixed regex takes microseconds.
    const line = Array.from({ length: 24 }, () => "5 tests collected").join(", ");
    const started = performance.now();
    const result = parsePytestOutput(`${line}\n3 passed in 0.10s`, "", 0);
    const elapsed = performance.now() - started;

    expect(result.passed).toBe(3);
    expect(elapsed).toBeLessThan(200);
  });

  it("uses stderr for the tail when stdout is empty", () => {
    const result = parsePytestOutput("", "custom reporter: 4 ok", 0);

    expect(result.countsUnavailable).toBe(true);
    expect(result.errorOutput).toBe("custom reporter: 4 ok");
  });

  it("truncates the raw tail kept for an unparsed passing run", () => {
    const long = `${"x".repeat(5000)}\nlast line of output`;
    const result = parsePytestOutput(long, "", 0);

    expect(result.countsUnavailable).toBe(true);
    expect(result.errorOutput).toContain("last line of output");
    expect(result.errorOutput).toContain("output truncated");
    expect(result.errorOutput!.length).toBeLessThan(2000);
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

describe("parsePytestOutput — failure blocks come only from FAILURES/ERRORS (#1181)", () => {
  // Real pytest 8.4 + pytest-cov 7.0 output (-v --cov=calc), trimmed.
  const COVERAGE_REPORT = [
    "=============================== tests coverage ================================",
    "_______________ coverage: platform win32, python 3.13.7-final-0 _______________",
    "",
    "Name      Stmts   Miss  Cover",
    "-----------------------------",
    "calc.py       4      1    75%",
    "-----------------------------",
    "TOTAL         4      1    75%",
  ];

  it("does not read pytest-cov's report header as a failure on a passing run", () => {
    const stdout = [
      "test_calc.py::test_add PASSED                                            [ 33%]",
      "test_calc.py::test_add_neg PASSED                                        [ 66%]",
      "test_calc.py::test_skip SKIPPED (later)                                  [100%]",
      "",
      ...COVERAGE_REPORT,
      "======================== 2 passed, 1 skipped in 0.39s =========================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(2);
    expect(result.failures).toEqual([]);
  });

  it("keeps the real failure and drops the coverage header on a failing run", () => {
    const stdout = [
      "================================== FAILURES ===================================",
      "________________________________ test_add_neg _________________________________",
      "",
      "    def test_add_neg():",
      ">       assert add(-1, -1) == 5",
      "E       assert -2 == 5",
      "E        +  where -2 = add(-1, -1)",
      "",
      "test_calc.py:8: AssertionError",
      ...COVERAGE_REPORT,
      "=========================== short test summary info ===========================",
      "FAILED test_calc.py::test_add_neg - assert -2 == 5",
      "=================== 1 failed, 1 passed, 1 skipped in 0.39s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([
      { test: "test_add_neg", message: "assert -2 == 5\n+  where -2 = add(-1, -1)" },
    ]);
  });

  it("ignores ruled headers in other sections, such as -rA's PASSES", () => {
    const stdout = [
      "=================================== PASSES ====================================",
      "___________________________________ test_ok ___________________________________",
      "----------------------------- Captured stdout call -----------------------------",
      "hello",
      "============================== 1 passed in 0.01s ==============================",
    ].join("\n");

    expect(parsePytestOutput(stdout, "", 0).failures).toEqual([]);
  });

  it("does not split a block at pytest's '_ _ _' traceback separators", () => {
    const stdout = [
      "================================== FAILURES ===================================",
      "__________________________________ test_deep __________________________________",
      "    def test_deep():",
      ">       helper()",
      "_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _",
      "    def helper():",
      ">       raise ValueError('deep')",
      "E       ValueError: deep",
      "=========================== short test summary info ===========================",
      "============================== 1 failed in 0.02s ==============================",
    ].join("\n");

    expect(parsePytestOutput(stdout, "", 1).failures).toEqual([
      { test: "test_deep", message: "ValueError: deep" },
    ]);
  });
});

describe("parsePytestOutput — rule and header scans are linear (#1182)", () => {
  // Sizes chosen so the old patterns take about a second (and fail the
  // assertion) without hanging inside the regex.
  it("handles a long run of '=' that does not end in '='", () => {
    // Old /^=+\s*(.*?)\s*=+$/: cubic, about 2.8 s here.
    const line = "=".repeat(2_500) + "x";
    const started = performance.now();
    const result = parsePytestOutput(`${line}\n3 passed in 0.10s`, "", 0);
    expect(performance.now() - started).toBeLessThan(200);
    expect(result.passed).toBe(3);
  });

  it("handles a long run of '_'", () => {
    // Old /_{3,}\s+(.+?)\s+_{3,}/g over the whole output: quadratic.
    const line = "_".repeat(40_000);
    const started = performance.now();
    const result = parsePytestOutput(`${line}\n3 passed in 0.10s`, "", 0);
    expect(performance.now() - started).toBeLessThan(200);
    expect(result.failures).toEqual([]);
  });
});
