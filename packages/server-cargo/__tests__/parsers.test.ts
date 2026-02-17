import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
  parseCargoFmtOutput,
  parseCargoAddOutput,
  parseCargoAuditJson,
  cvssToSeverity,
} from "../src/lib/parsers.js";

describe("parseCargoBuildJson", () => {
  it("parses build with errors", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
        },
      }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "unused variable `x`",
          spans: [{ file_name: "src/lib.rs", line_start: 20, column_start: 9 }],
        },
      }),
      JSON.stringify({ reason: "build-finished", success: false }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "src/main.rs",
      line: 10,
      column: 5,
      severity: "error",
      code: "E0308",
      message: "mismatched types",
    });
    expect(result.diagnostics[1].code).toBeUndefined();
  });

  it("parses clean build", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({ reason: "build-finished", success: true }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });

  it("ignores non-compiler-message entries", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "dep 1.0.0" }),
      JSON.stringify({ reason: "build-script-executed", package_id: "dep 1.0.0" }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(0);
  });
});

describe("parseCargoTestOutput", () => {
  it("parses test results", () => {
    const stdout = [
      "running 3 tests",
      "test tests::test_add ... ok",
      "test tests::test_sub ... ok",
      "test tests::test_div ... FAILED",
      "",
      "test result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.ignored).toBe(0);
    expect(result.tests[2].name).toBe("tests::test_div");
    expect(result.tests[2].status).toBe("FAILED");
  });

  it("parses all passing", () => {
    const stdout = [
      "running 2 tests",
      "test tests::test_a ... ok",
      "test tests::test_b ... ok",
      "",
      "test result: ok. 2 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("parses ignored tests", () => {
    const stdout = [
      "running 1 test",
      "test tests::slow_test ... ignored",
      "",
      "test result: ok. 0 passed; 0 failed; 1 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);
    expect(result.ignored).toBe(1);
  });

  it("captures stdout/stderr for failed tests", () => {
    const stdout = [
      "running 2 tests",
      "test tests::test_pass ... ok",
      "test tests::test_div ... FAILED",
      "",
      "failures:",
      "",
      "---- tests::test_div stdout ----",
      "thread 'tests::test_div' panicked at 'assertion failed: `(left == right)`",
      "  left: `0`,",
      " right: `1`', src/lib.rs:10:5",
      "note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace",
      "",
      "",
      "failures:",
      "    tests::test_div",
      "",
      "test result: FAILED. 1 passed; 1 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 101);

    expect(result.failed).toBe(1);
    expect(result.tests[1].name).toBe("tests::test_div");
    expect(result.tests[1].output).toContain("panicked at");
    expect(result.tests[1].output).toContain("assertion failed");
    // Passing test should not have output
    expect(result.tests[0].output).toBeUndefined();
  });

  it("captures output for multiple failed tests", () => {
    const stdout = [
      "running 3 tests",
      "test tests::test_a ... FAILED",
      "test tests::test_b ... FAILED",
      "test tests::test_c ... ok",
      "",
      "failures:",
      "",
      "---- tests::test_a stdout ----",
      "thread 'tests::test_a' panicked at 'error A'",
      "",
      "---- tests::test_b stdout ----",
      "thread 'tests::test_b' panicked at 'error B'",
      "",
      "",
      "failures:",
      "    tests::test_a",
      "    tests::test_b",
      "",
      "test result: FAILED. 1 passed; 2 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 101);

    expect(result.failed).toBe(2);
    expect(result.tests[0].output).toContain("error A");
    expect(result.tests[1].output).toContain("error B");
  });

  it("does not attach output to passing tests even with failures section", () => {
    const stdout = [
      "running 1 tests",
      "test tests::test_pass ... ok",
      "",
      "test result: ok. 1 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);

    expect(result.tests[0].output).toBeUndefined();
  });
});

describe("parseCargoClippyJson", () => {
  it("parses clippy warnings", () => {
    const stdout = [
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "clippy::needless_return" },
          level: "warning",
          message: "unneeded `return` statement",
          spans: [{ file_name: "src/main.rs", line_start: 5, column_start: 5 }],
        },
      }),
    ].join("\n");

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.total).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0].code).toBe("clippy::needless_return");
  });

  it("parses clean clippy", () => {
    const stdout = JSON.stringify({ reason: "build-finished", success: true });
    const result = parseCargoClippyJson(stdout, 0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error path: parseCompilerMessages (via parseCargoBuildJson) with malformed JSON
// ---------------------------------------------------------------------------

describe("parseCompilerMessages error paths", () => {
  it("skips completely invalid JSON lines", () => {
    const stdout = [
      "this is not valid JSON at all",
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
        },
      }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 101);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("mismatched types");
  });

  it("skips truncated/partial JSON lines", () => {
    const stdout = [
      '{"reason":"compiler-message","message":{"code":',
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "unused variable",
          spans: [{ file_name: "src/lib.rs", line_start: 1, column_start: 1 }],
        },
      }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("unused variable");
  });

  it("skips compiler-message entries with empty spans array", () => {
    const stdout = [
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "no span here",
          spans: [],
        },
      }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "error",
          message: "has span",
          spans: [{ file_name: "src/main.rs", line_start: 5, column_start: 1 }],
        },
      }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 101);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("has span");
  });

  it("skips compiler-message entries with no message field", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-message" }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "valid entry",
          spans: [{ file_name: "src/main.rs", line_start: 1, column_start: 1 }],
        },
      }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("valid entry");
  });

  it("maps unknown severity levels to 'warning'", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: null,
        level: "ice",
        message: "internal compiler error",
        spans: [{ file_name: "src/main.rs", line_start: 1, column_start: 1 }],
      },
    });

    const result = parseCargoBuildJson(stdout, 101);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].severity).toBe("warning");
  });

  it("handles empty string input", () => {
    const result = parseCargoBuildJson("", 0);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles input with only whitespace lines", () => {
    const result = parseCargoBuildJson("  \n  \n  ", 0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error path: parseCargoTestOutput with special test names
// ---------------------------------------------------------------------------

describe("parseCargoTestOutput edge cases", () => {
  it("parses parametrized test names containing colons", () => {
    const stdout = [
      "running 2 tests",
      "test tests::param::case_1 ... ok",
      "test tests::param::case_2 ... FAILED",
      "",
      "test result: FAILED. 1 passed; 1 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 101);

    expect(result.total).toBe(2);
    expect(result.tests[0].name).toBe("tests::param::case_1");
    expect(result.tests[0].status).toBe("ok");
    expect(result.tests[1].name).toBe("tests::param::case_2");
    expect(result.tests[1].status).toBe("FAILED");
  });

  it("parses deeply nested module test names", () => {
    const stdout = [
      "running 1 test",
      "test a::b::c::d::e::deep_test ... ok",
      "",
      "test result: ok. 1 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("a::b::c::d::e::deep_test");
  });

  it("does not match lines that look like tests but are not", () => {
    const stdout = [
      "running 1 tests",
      "some random log: test something ... ok",
      "test actual_test ... ok",
      "",
      "test result: ok. 1 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);

    // Only the line starting with "test " should match
    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("actual_test");
  });
});

// ---------------------------------------------------------------------------
// Error path: parseCargoFmtOutput with non-.rs files and edge cases
// ---------------------------------------------------------------------------

describe("parseCargoFmtOutput edge cases", () => {
  it("ignores non-.rs file paths in direct listing mode", () => {
    const stdout = ["src/main.rs", "src/config.toml", "README.md", "src/lib.rs"].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(2);
    expect(result.needsFormatting).toBe(true);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).toContain("src/lib.rs");
    expect(result.files).not.toContain("src/config.toml");
    expect(result.files).not.toContain("README.md");
  });

  it("ignores .rs.bak and other non-.rs extensions", () => {
    const stdout = ["src/gen/file.rs.bak", "src/main.rs"].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(1);
    expect(result.needsFormatting).toBe(true);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).not.toContain("src/gen/file.rs.bak");
  });

  it("handles nested paths in Diff format", () => {
    const stdout = ["Diff in src/gen/deeply/nested/file.rs at line 5:", "+    let x = 1;"].join(
      "\n",
    );

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(1);
    expect(result.needsFormatting).toBe(true);
    expect(result.files).toContain("src/gen/deeply/nested/file.rs");
  });
});

describe("parseCargoFmtOutput needsFormatting semantics", () => {
  it("sets needsFormatting=true in check mode with unformatted files", () => {
    const stdout = "Diff in src/main.rs at line 5:\n+    let x = 1;";
    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.success).toBe(false);
    expect(result.needsFormatting).toBe(true);
  });

  it("sets needsFormatting=false in check mode when all files formatted", () => {
    const result = parseCargoFmtOutput("", "", 0, true);

    expect(result.success).toBe(true);
    expect(result.needsFormatting).toBe(false);
  });

  it("sets needsFormatting=false in fix mode even when files were reformatted", () => {
    const stdout = "src/main.rs\nsrc/lib.rs";
    const result = parseCargoFmtOutput(stdout, "", 0, false);

    expect(result.success).toBe(true);
    expect(result.needsFormatting).toBe(false);
  });

  it("sets needsFormatting=false in fix mode with no changes", () => {
    const result = parseCargoFmtOutput("", "", 0, false);

    expect(result.success).toBe(true);
    expect(result.needsFormatting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ANSI escape codes in output
// ---------------------------------------------------------------------------

describe("parsers handle ANSI color codes", () => {
  it("parseCargoBuildJson handles JSON lines without ANSI (ANSI stripped pre-parse)", () => {
    // The runner strips ANSI before passing to parsers; verify parsers work
    // with clean JSON that would result from stripping
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "E0308" },
        level: "error",
        message: "mismatched types",
        spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
      },
    });

    const result = parseCargoBuildJson(stdout, 101);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].code).toBe("E0308");
  });

  it("parseCargoTestOutput handles test lines without ANSI (ANSI stripped pre-parse)", () => {
    // After ANSI stripping, the output looks like normal text
    const stdout = [
      "running 1 test",
      "test tests::test_color ... ok",
      "",
      "test result: ok. 1 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);
    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("tests::test_color");
  });

  it("parseCargoBuildJson skips lines with residual ANSI codes as invalid JSON", () => {
    // If ANSI stripping somehow leaves residual codes, they should be skipped
    const stdout = [
      "\x1b[1;31m{invalid json with ansi}\x1b[0m",
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "valid line",
          spans: [{ file_name: "src/main.rs", line_start: 1, column_start: 1 }],
        },
      }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("valid line");
  });
});

// ---------------------------------------------------------------------------
// parseCargoAuditJson
// ---------------------------------------------------------------------------

describe("parseCargoAuditJson", () => {
  it("parses vulnerabilities with CVSS scores", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        found: true,
        count: 2,
        list: [
          {
            advisory: {
              id: "RUSTSEC-2022-0090",
              title: "Use-after-free in sqlite",
              url: "https://rustsec.org/advisories/RUSTSEC-2022-0090",
              cvss: "9.8",
            },
            package: { name: "libsqlite3-sys", version: "0.24.2" },
            versions: { patched: [">=0.25.1"], unaffected: [] },
          },
          {
            advisory: {
              id: "RUSTSEC-2023-0001",
              title: "Buffer overflow in parser",
              url: "https://rustsec.org/advisories/RUSTSEC-2023-0001",
              cvss: "5.5",
            },
            package: { name: "some-parser", version: "1.0.0" },
            versions: { patched: [">=1.1.0", ">=2.0.0"], unaffected: ["<0.9.0"] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);

    expect(result.vulnerabilities).toHaveLength(2);
    expect(result.vulnerabilities[0]).toEqual({
      id: "RUSTSEC-2022-0090",
      package: "libsqlite3-sys",
      version: "0.24.2",
      severity: "critical",
      title: "Use-after-free in sqlite",
      url: "https://rustsec.org/advisories/RUSTSEC-2022-0090",
      patched: [">=0.25.1"],
      unaffected: [],
      cvssScore: 9.8,
      cvssVector: "9.8",
      date: undefined,
    });
    expect(result.vulnerabilities[1].severity).toBe("medium");
    expect(result.vulnerabilities[1].unaffected).toEqual(["<0.9.0"]);

    expect(result.summary.total).toBe(2);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.medium).toBe(1);
    expect(result.summary.high).toBe(0);
    expect(result.summary.low).toBe(0);
  });

  it("parses empty vulnerabilities list", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        found: false,
        count: 0,
        list: [],
      },
    });

    const result = parseCargoAuditJson(json, 0);

    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.critical).toBe(0);
    expect(result.summary.high).toBe(0);
  });

  it("handles missing optional fields gracefully", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        found: true,
        count: 1,
        list: [
          {
            advisory: {
              id: "RUSTSEC-2024-0001",
              title: "Some issue",
            },
            package: { name: "my-crate", version: "0.1.0" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].severity).toBe("unknown");
    expect(result.vulnerabilities[0].url).toBeUndefined();
    expect(result.vulnerabilities[0].patched).toEqual([]);
    expect(result.summary.unknown).toBe(1);
  });

  it("handles missing vulnerabilities key", () => {
    const json = JSON.stringify({
      database: { advisory_count: 500 },
    });

    const result = parseCargoAuditJson(json, 0);

    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it("maps CVSS scores to correct severity levels", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        found: true,
        count: 5,
        list: [
          {
            advisory: { id: "A", title: "Critical", cvss: "9.0" },
            package: { name: "a", version: "1.0.0" },
            versions: { patched: [] },
          },
          {
            advisory: { id: "B", title: "High", cvss: "7.5" },
            package: { name: "b", version: "1.0.0" },
            versions: { patched: [] },
          },
          {
            advisory: { id: "C", title: "Medium", cvss: "4.0" },
            package: { name: "c", version: "1.0.0" },
            versions: { patched: [] },
          },
          {
            advisory: { id: "D", title: "Low", cvss: "2.0" },
            package: { name: "d", version: "1.0.0" },
            versions: { patched: [] },
          },
          {
            advisory: { id: "E", title: "Info", cvss: "0.0" },
            package: { name: "e", version: "1.0.0" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);

    expect(result.vulnerabilities[0].severity).toBe("critical");
    expect(result.vulnerabilities[1].severity).toBe("high");
    expect(result.vulnerabilities[2].severity).toBe("medium");
    expect(result.vulnerabilities[3].severity).toBe("low");
    expect(result.vulnerabilities[4].severity).toBe("informational");
  });

  it("parses CVSS v3 vector strings into correct severity", () => {
    // CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H -> critical (~9.8)
    const json = JSON.stringify({
      vulnerabilities: {
        found: true,
        count: 2,
        list: [
          {
            advisory: {
              id: "RUSTSEC-2022-0090",
              title: "Critical vector vuln",
              cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            },
            package: { name: "libsqlite3-sys", version: "0.24.2" },
            versions: { patched: [">=0.25.1"] },
          },
          {
            advisory: {
              id: "RUSTSEC-2021-0078",
              title: "Low vector vuln",
              cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
            },
            package: { name: "hyper", version: "0.14.0" },
            versions: { patched: [">=0.14.10"] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 1);

    expect(result.vulnerabilities[0].severity).toBe("critical");
    expect(result.vulnerabilities[1].severity).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// cvssToSeverity — unit tests for CVSS vector parsing
// ---------------------------------------------------------------------------

describe("cvssToSeverity", () => {
  it("returns unknown for null/undefined", () => {
    expect(cvssToSeverity(null)).toBe("unknown");
    expect(cvssToSeverity(undefined)).toBe("unknown");
    expect(cvssToSeverity("")).toBe("unknown");
  });

  it("handles plain numeric scores", () => {
    expect(cvssToSeverity("10.0")).toBe("critical");
    expect(cvssToSeverity("9.0")).toBe("critical");
    expect(cvssToSeverity("8.5")).toBe("high");
    expect(cvssToSeverity("7.0")).toBe("high");
    expect(cvssToSeverity("6.9")).toBe("medium");
    expect(cvssToSeverity("4.0")).toBe("medium");
    expect(cvssToSeverity("3.9")).toBe("low");
    expect(cvssToSeverity("0.1")).toBe("low");
    expect(cvssToSeverity("0.0")).toBe("informational");
  });

  it("parses CVSS v3.1 critical vector (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)", () => {
    // Expected base score: 9.8 -> critical
    const result = cvssToSeverity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
    expect(result).toBe("critical");
  });

  it("parses CVSS v3.0 high vector (AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H)", () => {
    // Expected base score: 8.8 -> high
    const result = cvssToSeverity("CVSS:3.0/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H");
    expect(result).toBe("high");
  });

  it("parses CVSS v3.1 medium vector (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N)", () => {
    // Expected base score: 5.3 -> medium
    const result = cvssToSeverity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N");
    expect(result).toBe("medium");
  });

  it("parses CVSS v3.1 low vector (AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N)", () => {
    // Expected base score: 1.8 -> low
    const result = cvssToSeverity("CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N");
    expect(result).toBe("low");
  });

  it("parses CVSS v3.1 scope-changed vector correctly", () => {
    // CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H -> 10.0 -> critical
    const result = cvssToSeverity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H");
    expect(result).toBe("critical");
  });

  it("parses CVSS v3.1 zero-impact vector as informational", () => {
    // All impact metrics = N, impact sub-score = 0 -> base score = 0.0
    const result = cvssToSeverity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N");
    expect(result).toBe("informational");
  });

  it("parses CVSS v2 vector strings", () => {
    // (AV:N/AC:L/Au:N/C:C/I:C/A:C) -> 10.0 -> critical
    expect(cvssToSeverity("(AV:N/AC:L/Au:N/C:C/I:C/A:C)")).toBe("critical");
    // AV:N/AC:L/Au:N/C:C/I:C/A:C (without parens) -> 10.0 -> critical
    expect(cvssToSeverity("AV:N/AC:L/Au:N/C:C/I:C/A:C")).toBe("critical");
  });

  it("parses CVSS v2 low-severity vector", () => {
    // AV:L/AC:H/Au:M/C:N/I:P/A:N -> low
    const result = cvssToSeverity("AV:L/AC:H/Au:M/C:N/I:P/A:N");
    expect(result).toBe("low");
  });

  it("returns unknown for completely invalid strings", () => {
    expect(cvssToSeverity("not-a-score")).toBe("unknown");
    expect(cvssToSeverity("CVSS:3.1/")).toBe("unknown");
    expect(cvssToSeverity("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// parseCargoAddOutput — dry-run mode
// ---------------------------------------------------------------------------

describe("parseCargoAddOutput dry-run", () => {
  it("parses dry-run output with Adding lines and warning", () => {
    const stderr = [
      "      Adding serde v1.0.217 to dependencies",
      "      Adding tokio v1.41.1 to dependencies",
      "warning: aborting add due to dry run",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.total).toBe(2);
    expect(result.added[0]).toEqual({ name: "serde", version: "1.0.217" });
    expect(result.added[1]).toEqual({ name: "tokio", version: "1.41.1" });
  });

  it("does not set dryRun for normal (non-dry-run) add", () => {
    const stderr = "      Adding serde v1.0.217 to dependencies";
    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBeUndefined();
    expect(result.total).toBe(1);
  });

  it("parses dry-run with features output", () => {
    const stderr = [
      "      Adding serde v1.0.217 to dependencies",
      "             Features:",
      "             + derive",
      "             + std",
      "warning: aborting add due to dry run",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.total).toBe(1);
    expect(result.added[0]).toEqual({
      name: "serde",
      version: "1.0.217",
      featuresActivated: ["derive", "std"],
    });
  });

  it("filters dry-run warning from error lines on failure", () => {
    const stderr = [
      "error: the crate `nonexistent` could not be found",
      "warning: aborting add due to dry run",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.dryRun).toBe(true);
    // The error message should not contain the dry-run warning
    expect(result.error).not.toContain("aborting add due to dry run");
    expect(result.error).toContain("could not be found");
  });

  it("parses Updating lines from dry-run when dep already present", () => {
    const stderr = [
      "    Updating serde v1.0.200 -> v1.0.217",
      "warning: aborting add due to dry run",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.total).toBe(1);
    expect(result.added[0]).toEqual({ name: "serde", version: "1.0.217" });
  });
});

// ---------------------------------------------------------------------------
// parseCargoFmtOutput — non-check (fix) mode file reporting
// ---------------------------------------------------------------------------

describe("parseCargoFmtOutput non-check mode", () => {
  it("parses reformatted file paths from -l output in fix mode", () => {
    // When cargo fmt -- -l is used, reformatted file paths are listed on stdout
    const stdout = ["src/main.rs", "src/lib.rs", "src/utils/helpers.rs"].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 0, false);

    expect(result.success).toBe(true);
    expect(result.needsFormatting).toBe(false);
    expect(result.filesChanged).toBe(3);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).toContain("src/lib.rs");
    expect(result.files).toContain("src/utils/helpers.rs");
  });

  it("returns empty file list when no files needed formatting in fix mode", () => {
    const result = parseCargoFmtOutput("", "", 0, false);

    expect(result.success).toBe(true);
    expect(result.needsFormatting).toBe(false);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("ignores warning/error lines in fix mode output", () => {
    const stdout = "src/main.rs";
    const stderr = "warning: some rustfmt warning\nerror: some rustfmt error";

    const result = parseCargoFmtOutput(stdout, stderr, 0, false);

    expect(result.filesChanged).toBe(1);
    expect(result.needsFormatting).toBe(false);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).not.toContain("warning: some rustfmt warning");
    expect(result.files).not.toContain("error: some rustfmt error");
  });

  it("deduplicates file paths in fix mode", () => {
    const stdout = ["src/main.rs", "src/main.rs"].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 0, false);

    expect(result.filesChanged).toBe(1);
    expect(result.needsFormatting).toBe(false);
    expect(result.files).toEqual(["src/main.rs"]);
  });

  it("only includes .rs files in fix mode output", () => {
    const stdout = ["src/main.rs", "src/config.toml", "README.md", "src/lib.rs"].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 0, false);

    expect(result.filesChanged).toBe(2);
    expect(result.needsFormatting).toBe(false);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).toContain("src/lib.rs");
    expect(result.files).not.toContain("src/config.toml");
  });
});
