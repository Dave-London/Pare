import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
  parseCargoFmtOutput,
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

    const result = parseCargoClippyJson(stdout);
    expect(result.total).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0].code).toBe("clippy::needless_return");
  });

  it("parses clean clippy", () => {
    const stdout = JSON.stringify({ reason: "build-finished", success: true });
    const result = parseCargoClippyJson(stdout);
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
    const stdout = [
      "src/main.rs",
      "src/config.toml",
      "README.md",
      "src/lib.rs",
    ].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(2);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).toContain("src/lib.rs");
    expect(result.files).not.toContain("src/config.toml");
    expect(result.files).not.toContain("README.md");
  });

  it("ignores .rs.bak and other non-.rs extensions", () => {
    const stdout = [
      "src/gen/file.rs.bak",
      "src/main.rs",
    ].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(1);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).not.toContain("src/gen/file.rs.bak");
  });

  it("handles nested paths in Diff format", () => {
    const stdout = [
      "Diff in src/gen/deeply/nested/file.rs at line 5:",
      "+    let x = 1;",
    ].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.filesChanged).toBe(1);
    expect(result.files).toContain("src/gen/deeply/nested/file.rs");
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
