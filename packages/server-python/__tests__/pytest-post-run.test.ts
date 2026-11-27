import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePytestOutput } from "../src/lib/parsers.js";
import { formatPytest, compactPytestMap, formatPytestCompact } from "../src/lib/formatters.js";
import { PytestResultSchema } from "../src/schemas/index.js";

// #1215: pytest exits non-zero AFTER the tests ran when a plugin or hook raises
// during reporting or teardown (the report: a rich MarkupError on "[/bots/create]").
// Fixtures are real pytest 8.4.2 output (Windows, --tb=short --verbosity=-1, the
// tool's defaults), from a clean venv with only pytest, rich and pytest-cov. The
// conftest hook printing "route [/bots/create] done" through rich.Console raises.
// Local paths are replaced with C:\proj.

const FIXTURES = join(import.meta.dirname, "fixtures", "pytest-post-run");
const read = (name: string) => readFileSync(join(FIXTURES, name), "utf8");
const MARKUP_ERROR =
  "rich.errors.MarkupError: closing tag '[/bots/create]' at position 6 doesn't match any open tag";

describe("parsePytestOutput: errors after the tests ran (#1215)", () => {
  it("summary printed, then a hook raised: keeps the counts, flags postRunError", () => {
    // pytest_unconfigure raised after "2 passed in 0.00s" was printed.
    const r = parsePytestOutput(
      read("unconfigure-crash-after-summary.stdout.txt"),
      read("unconfigure-crash-after-summary.stderr.txt"),
      1,
    );
    expect(r).toMatchObject({
      success: false,
      passed: 2,
      failed: 0,
      errors: 0,
      exitCode: 1,
      postRunError: true,
    });
    expect(r.countsUnavailable).toBeUndefined();
    expect(r.errorOutput).toContain(MARKUP_ERROR);
    expect(PytestResultSchema.parse(r)).toBeTruthy();
  });

  it("hook raised before the summary line on a passing run: counts unknown, not 'nothing ran'", () => {
    // pytest_terminal_summary raised; stdout is only the "..  [100%]" progress line.
    const r = parsePytestOutput(
      read("summary-hook-crash-passing.stdout.txt"),
      read("summary-hook-crash-passing.stderr.txt"),
      1,
    );
    expect(r).toMatchObject({ success: false, failed: 0, exitCode: 1, countsUnavailable: true });
    expect(r.failures).toEqual([]);
    expect(r.postRunError).toBeUndefined();
    // The traceback on stderr, not the stdout progress line.
    expect(r.errorOutput).toContain(MARKUP_ERROR);
  });

  it("hook raised before the summary line on a failing run: keeps the printed failure", () => {
    const r = parsePytestOutput(
      read("summary-hook-crash-one-failed.stdout.txt"),
      read("summary-hook-crash-one-failed.stderr.txt"),
      1,
    );
    expect(r).toMatchObject({ success: false, exitCode: 1, countsUnavailable: true });
    expect(r.failures).toEqual([
      { test: "test_bad", message: "AssertionError: math is broken\nassert (2 + 2) == 5" },
    ]);
    // Before #1215 errorOutput was the stdout tail, which hid this traceback.
    expect(r.errorOutput).toContain(MARKUP_ERROR);
  });

  it("handles CRLF output the same way", () => {
    const crlf = (s: string) => s.replace(/\n/g, "\r\n");
    const r = parsePytestOutput(
      crlf(read("unconfigure-crash-after-summary.stdout.txt")),
      crlf(read("unconfigure-crash-after-summary.stderr.txt")),
      1,
    );
    expect(r).toMatchObject({ passed: 2, postRunError: true, exitCode: 1 });
    const r2 = parsePytestOutput(
      crlf(read("summary-hook-crash-passing.stdout.txt")),
      crlf(read("summary-hook-crash-passing.stderr.txt")),
      1,
    );
    expect(r2.countsUnavailable).toBe(true);
  });

  it("--cov-fail-under: tests passed, coverage check failed -> postRunError with the message", () => {
    // pytest-cov prints its failure on stdout; stderr is empty.
    const r = parsePytestOutput(read("cov-fail-under.stdout.txt"), "", 1);
    expect(r).toMatchObject({ success: false, passed: 1, exitCode: 1, postRunError: true });
    expect(r.errorOutput).toContain("FAIL Required test coverage of 100% not reached");
  });

  it("prefers pytest's INTERNALERROR lines when present", () => {
    const stdout = [
      "..                                                                       [100%]",
      "INTERNALERROR> Traceback (most recent call last):",
      'INTERNALERROR>   File "C:\\proj\\conftest.py", line 3, in pytest_sessionfinish',
      "INTERNALERROR> RuntimeError: boom",
      "2 passed in 0.01s",
    ].join("\n");
    const r = parsePytestOutput(stdout, "some unrelated warning on stderr", 3);
    expect(r).toMatchObject({ passed: 2, exitCode: 3, postRunError: true });
    expect(r.errorOutput).toContain("INTERNALERROR> RuntimeError: boom");
    expect(r.errorOutput).not.toContain("unrelated warning");
  });

  // ── unchanged paths ──

  it("a normal failing run is not a post-run error", () => {
    const stdout = [
      "..F                                                                      [100%]",
      "=========================== short test summary info ===========================",
      "FAILED test_x.py::test_bad - AssertionError: math is broken",
      "1 failed, 2 passed in 0.02s",
    ].join("\n");
    const r = parsePytestOutput(stdout, "", 1);
    expect(r).toMatchObject({ success: false, passed: 2, failed: 1 });
    expect(r.postRunError).toBeUndefined();
    expect(r.countsUnavailable).toBeUndefined();
    expect(r.exitCode).toBeUndefined();
    expect(r.failures).toHaveLength(1);
  });

  it("a crash before any test ran keeps the empty-run diagnostics", () => {
    // No progress line: nothing ran, so this is not countsUnavailable.
    const stderr =
      "ImportError while loading conftest 'C:\\proj\\conftest.py'.\n" +
      "conftest.py:1: in <module>\n    import missing_mod\n" +
      "E   ModuleNotFoundError: No module named 'missing_mod'";
    const r = parsePytestOutput("", stderr, 4);
    expect(r).toMatchObject({ success: false, passed: 0, exitCode: 4 });
    expect(r.countsUnavailable).toBeUndefined();
    expect(r.postRunError).toBeUndefined();
    expect(r.errorOutput).toContain("ModuleNotFoundError");
  });

  it("exit 5 (no tests collected) is not a post-run error", () => {
    const r = parsePytestOutput("no tests ran in 0.01s", "", 5);
    expect(r.success).toBe(true);
    expect(r.postRunError).toBeUndefined();
  });
});

describe("pytest formatters: post-run errors (#1215)", () => {
  const post = parsePytestOutput(
    read("unconfigure-crash-after-summary.stdout.txt"),
    read("unconfigure-crash-after-summary.stderr.txt"),
    1,
  );
  const crashed = parsePytestOutput(
    read("summary-hook-crash-one-failed.stdout.txt"),
    read("summary-hook-crash-one-failed.stderr.txt"),
    1,
  );

  it("full text names the post-run error and shows the traceback", () => {
    const text = formatPytest(post);
    expect(text).toMatch(/^pytest: 2 passed\n/);
    expect(text).toContain("pytest exited 1 after the tests finished (post-run error");
    expect(text).toContain(MARKUP_ERROR);
  });

  it("full text for a crash before the summary says the counts are unknown, not exit 0", () => {
    const text = formatPytest(crashed);
    expect(text).toContain("pytest exited 1 before printing its summary line");
    expect(text).not.toContain("exited 0");
    expect(text).toContain("FAILED test_bad: AssertionError: math is broken");
    expect(text).toContain(MARKUP_ERROR);
  });

  it("compact output keeps postRunError, countsUnavailable, exitCode and failure names", () => {
    const c1 = compactPytestMap(post);
    expect(c1).toMatchObject({ passed: 2, postRunError: true, exitCode: 1 });
    expect(formatPytestCompact(c1)).toContain("post-run error");

    const c2 = compactPytestMap(crashed);
    expect(c2).toMatchObject({ countsUnavailable: true, exitCode: 1, failedTests: ["test_bad"] });
    expect(formatPytestCompact(c2)).toContain("FAILED test_bad");
  });
});
