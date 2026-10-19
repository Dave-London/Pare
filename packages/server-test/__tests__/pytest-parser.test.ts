import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parsePytestOutput,
  parsePytestCoverage,
  parsePytestCoverageJson,
} from "../src/lib/parsers/pytest.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("parsePytestOutput", () => {
  it("parses all-pass output", () => {
    const result = parsePytestOutput(fixture("pytest-pass.txt"));

    expect(result.framework).toBe("pytest");
    expect(result.summary.total).toBe(12);
    expect(result.summary.passed).toBe(12);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.duration).toBe(0.47);
    expect(result.failures).toHaveLength(0);
    expect((result.tests ?? []).length).toBeGreaterThan(0);
  });

  it("parses output with failures", () => {
    const result = parsePytestOutput(fixture("pytest-fail.txt"));

    expect(result.framework).toBe("pytest");
    expect(result.summary.total).toBe(12);
    expect(result.summary.passed).toBe(10);
    expect(result.summary.failed).toBe(2);
    expect(result.summary.duration).toBe(0.83);
    expect(result.failures).toHaveLength(2);

    expect(result.failures[0].file).toBe("tests/test_api.py");
    expect(result.failures[0].name).toBe("test_create_user");
    expect(result.failures[0].message).toContain("assert 201 == 200");

    expect(result.failures[1].file).toBe("tests/test_models.py");
    expect(result.failures[1].name).toBe("test_post_model");
    expect(result.failures[1].message).toContain("missing required field");
  });

  it("handles empty output gracefully", () => {
    const result = parsePytestOutput("");

    expect(result.summary.total).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  // Skip reasons carrying libpq's "port 5555 failed: Connection refused" text used
  // to be scraped as a failure count. See issues #1061 / #1045.
  it("ignores numbers in skip reasons and parses only the summary line (#1061)", () => {
    const stdout = [
      "============================= test session starts =============================",
      "collected 201 items",
      "",
      "tests/test_db.py::test_query SKIPPED",
      "",
      "=========================== short test summary info ===========================",
      'SKIPPED [1] tests/test_db.py:12: postgres_only: connection to server at "localhost" (127.0.0.1), port 5555 failed: Connection refused',
      "SKIPPED [3] tests/conftest.py:88: requires Postgres on port 5555",
      "======================= 197 passed, 4 skipped in 12.34s =======================",
    ].join("\n");

    const result = parsePytestOutput(stdout);

    expect(result.summary.failed).toBe(0);
    expect(result.summary.passed).toBe(197);
    expect(result.summary.skipped).toBe(4);
    expect(result.summary.total).toBe(201);
    expect(result.summary.duration).toBe(12.34);
    expect(result.failures).toHaveLength(0);
  });

  it("parses the undecorated summary line emitted by pytest -q", () => {
    const result = parsePytestOutput("....s\n4 passed, 1 skipped in 0.52s");

    expect(result.summary.passed).toBe(4);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.duration).toBe(0.52);
  });

  it("takes the last summary line when several are printed", () => {
    const stdout = [
      "==================== 1 failed, 1 passed in 0.50s ====================",
      "Rerunning failed tests…",
      "==================== 2 passed in 0.90s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout);

    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.duration).toBe(0.9);
  });

  // Fixtures below are real pytest 8.4 -v output (#1178).
  describe("setup, teardown and collection errors", () => {
    it("counts errors in failed and lists them alongside failed tests", () => {
      const result = parsePytestOutput(fixture("pytest-errors-mixed.txt"));

      // "1 failed, 3 passed, 2 errors"
      expect(result.summary.passed).toBe(3);
      expect(result.summary.failed).toBe(3);
      expect(result.summary.errors).toBe(2);
      expect(result.failures).toEqual([
        { file: "test_mix.py", name: "test_fails", message: "assert 1 == 2" },
        {
          file: "test_mix.py",
          name: "test_setup_error",
          message: "ERROR: RuntimeError: setup exploded",
        },
        {
          file: "test_mix.py",
          name: "test_teardown_error",
          message: "ERROR: ValueError: teardown exploded",
        },
      ]);
    });

    it("marks errored tests failed, once each, even when teardown follows a PASSED", () => {
      const result = parsePytestOutput(fixture("pytest-errors-mixed.txt"));
      const byName = Object.fromEntries((result.tests ?? []).map((t) => [t.name, t.status]));

      expect(result.tests).toHaveLength(5);
      expect(byName).toEqual({
        test_ok: "passed",
        test_fails: "failed",
        test_setup_error: "failed",
        test_teardown_error: "failed",
        test_a: "passed",
      });
    });

    it("does not report a passed-plus-error run as failed: 0", () => {
      const result = parsePytestOutput(fixture("pytest-pass-and-error.txt"));

      // "1 passed, 1 error"
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.errors).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].name).toBe("test_setup_error");
    });

    it("reports a module that fails to collect, with the error from its block", () => {
      const result = parsePytestOutput(fixture("pytest-collection-error.txt"));

      // "1 error" (collection interrupted)
      expect(result.summary.failed).toBe(1);
      expect(result.summary.errors).toBe(1);
      expect(result.failures).toEqual([
        {
          file: "test_collect_bad.py",
          name: "test_collect_bad.py",
          message: "ERROR: ModuleNotFoundError: No module named 'not_a_real_module_xyz'",
        },
      ]);
    });

    it("omits summary.errors when there are none", () => {
      const result = parsePytestOutput(fixture("pytest-fail.txt"));
      expect(result.summary.errors).toBeUndefined();
    });
  });

  it("strips long '=' rules in linear time (#1182)", () => {
    // The old /^=+\s*(.*?)\s*=+$/ is cubic on a run of "=" that does not end
    // in "=": about a second at 2,000 characters.
    const line = "=".repeat(2_500) + "x";
    const start = performance.now();
    const result = parsePytestOutput(
      `${line}\n${"=".repeat(5)} 1 passed in 0.10s ${"=".repeat(5)}`,
    );
    expect(performance.now() - start).toBeLessThan(250);
    expect(result.summary.passed).toBe(1);
  });
});

describe("parsePytestCoverage", () => {
  it("parses coverage report", () => {
    const result = parsePytestCoverage(fixture("pytest-coverage.txt"));

    expect(result.framework).toBe("pytest");
    expect(result.summary.lines).toBe(88);
    expect(result.summary.statements).toBe(88);
    expect(result.files).toHaveLength(4);

    expect(result.files[0]).toEqual({ file: "src/auth.py", statements: 92, lines: 92 });
    expect(result.files[1]).toEqual({ file: "src/api.py", statements: 80, lines: 80 });
    expect(result.files[2]).toEqual({ file: "src/models.py", statements: 90, lines: 90 });
    expect(result.files[3]).toEqual({ file: "src/utils.py", statements: 100, lines: 100 });
  });

  it("parses coverage.py JSON report", () => {
    const json = JSON.stringify({
      totals: { percent_covered: 90.5 },
      files: {
        "src/a.py": { summary: { percent_covered: 100 }, missing_lines: [] },
        "src/b.py": { summary: { percent_covered: 81.5 }, missing_lines: [12, 13] },
      },
    });
    const result = parsePytestCoverageJson(json);
    expect(result.summary.lines).toBe(90.5);
    expect(result.summary.statements).toBe(90.5);
    expect(result.totalFiles).toBe(2);
    expect(result.files?.[1]).toEqual({
      file: "src/b.py",
      statements: 81.5,
      lines: 81.5,
      uncoveredLines: [12, 13],
    });
  });
});
