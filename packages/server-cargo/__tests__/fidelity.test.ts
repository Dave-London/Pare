/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw cargo CLI output.
 *
 * These tests use realistic fixtures (no Rust toolchain required) to ensure
 * parsers extract every diagnostic field, test result, and count without
 * data loss.
 */
import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
  parseCargoRunOutput,
  parseCargoAddOutput,
  parseCargoRemoveOutput,
  parseCargoFmtOutput,
  parseCargoDocOutput,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// Helper: build a cargo JSON line
// ---------------------------------------------------------------------------

function compilerMessage(
  level: string,
  message: string,
  file: string,
  line: number,
  column: number,
  code?: string,
): string {
  return JSON.stringify({
    reason: "compiler-message",
    message: {
      code: code ? { code } : null,
      level,
      message,
      spans: [{ file_name: file, line_start: line, column_start: column }],
    },
  });
}

function nonDiagnosticLine(reason: string): string {
  return JSON.stringify({ reason, package_id: "myapp 0.1.0" });
}

// ---------------------------------------------------------------------------
// Build fixtures
// ---------------------------------------------------------------------------

const BUILD_SINGLE_ERROR = [
  nonDiagnosticLine("compiler-artifact"),
  compilerMessage("error", "mismatched types", "src/main.rs", 10, 5, "E0308"),
  nonDiagnosticLine("build-finished"),
].join("\n");

const BUILD_MULTIPLE_MIXED = [
  nonDiagnosticLine("compiler-artifact"),
  compilerMessage("error", "mismatched types", "src/main.rs", 10, 5, "E0308"),
  compilerMessage("warning", "unused variable `x`", "src/lib.rs", 20, 9),
  compilerMessage("error", "cannot find value `y`", "src/utils.rs", 35, 12, "E0425"),
  compilerMessage("warning", "unused import: `HashMap`", "src/lib.rs", 1, 5, "unused_imports"),
  nonDiagnosticLine("build-finished"),
].join("\n");

const BUILD_CLEAN = [
  nonDiagnosticLine("compiler-artifact"),
  nonDiagnosticLine("compiler-artifact"),
  nonDiagnosticLine("build-finished"),
].join("\n");

const BUILD_ERROR_WITH_CODE = [
  compilerMessage("error", "expected `bool`, found `i32`", "src/main.rs", 42, 18, "E0308"),
].join("\n");

const BUILD_NOTE_SEVERITY = [
  compilerMessage("note", "required by a bound in `Foo`", "src/main.rs", 5, 1),
  compilerMessage("help", "consider adding a `#[derive(Debug)]`", "src/main.rs", 3, 1),
].join("\n");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_ALL_PASS = [
  "running 3 tests",
  "test tests::test_add ... ok",
  "test tests::test_sub ... ok",
  "test tests::test_mul ... ok",
  "",
  "test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out",
].join("\n");

const TEST_MIXED = [
  "running 5 tests",
  "test tests::test_add ... ok",
  "test tests::test_sub ... FAILED",
  "test tests::test_mul ... ok",
  "test tests::test_div ... FAILED",
  "test tests::test_slow ... ignored",
  "",
  "test result: FAILED. 2 passed; 2 failed; 1 ignored; 0 measured; 0 filtered out",
].join("\n");

const TEST_SINGLE_FAILURE = [
  "running 1 test",
  "test tests::test_panic ... FAILED",
  "",
  "failures:",
  "",
  "---- tests::test_panic stdout ----",
  "thread 'tests::test_panic' panicked at 'assertion failed'",
  "",
  "failures:",
  "    tests::test_panic",
  "",
  "test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out",
].join("\n");

const TEST_EMPTY = "";

const TEST_ALL_IGNORED = [
  "running 2 tests",
  "test tests::expensive_test ... ignored",
  "test tests::slow_integration ... ignored",
  "",
  "test result: ok. 0 passed; 0 failed; 2 ignored; 0 measured; 0 filtered out",
].join("\n");

// ---------------------------------------------------------------------------
// Clippy fixtures
// ---------------------------------------------------------------------------

const CLIPPY_WARNINGS_WITH_CODES = [
  compilerMessage(
    "warning",
    "unneeded `return` statement",
    "src/main.rs",
    5,
    5,
    "clippy::needless_return",
  ),
  compilerMessage(
    "warning",
    "this could be simplified",
    "src/lib.rs",
    12,
    9,
    "clippy::redundant_closure",
  ),
].join("\n");

const CLIPPY_MIXED = [
  compilerMessage(
    "warning",
    "unneeded `return` statement",
    "src/main.rs",
    5,
    5,
    "clippy::needless_return",
  ),
  compilerMessage("error", "mismatched types", "src/main.rs", 10, 5, "E0308"),
  compilerMessage(
    "warning",
    "unused variable `x`",
    "src/lib.rs",
    20,
    9,
  ),
].join("\n");

const CLIPPY_CLEAN = [
  nonDiagnosticLine("compiler-artifact"),
  nonDiagnosticLine("build-finished"),
].join("\n");

const CLIPPY_SAME_FILE = [
  compilerMessage(
    "warning",
    "unneeded `return` statement",
    "src/main.rs",
    5,
    5,
    "clippy::needless_return",
  ),
  compilerMessage(
    "warning",
    "this could be simplified",
    "src/main.rs",
    18,
    12,
    "clippy::redundant_closure",
  ),
  compilerMessage(
    "warning",
    "variable does not need to be mutable",
    "src/main.rs",
    30,
    9,
    "clippy::unused_mut",
  ),
  compilerMessage(
    "error",
    "cannot find value `z`",
    "src/main.rs",
    45,
    3,
    "E0425",
  ),
].join("\n");

// ---------------------------------------------------------------------------
// Build fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoBuildJson", () => {
  it("single compiler error: preserves file, line, column, severity, code, message", () => {
    const result = parseCargoBuildJson(BUILD_SINGLE_ERROR, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toHaveLength(1);

    const diag = result.diagnostics[0];
    expect(diag.file).toBe("src/main.rs");
    expect(diag.line).toBe(10);
    expect(diag.column).toBe(5);
    expect(diag.severity).toBe("error");
    expect(diag.code).toBe("E0308");
    expect(diag.message).toBe("mismatched types");
  });

  it("multiple errors and warnings mixed: all diagnostics captured with correct counts", () => {
    const result = parseCargoBuildJson(BUILD_MULTIPLE_MIXED, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(4);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(2);
    expect(result.diagnostics).toHaveLength(4);

    // Verify all files are represented
    const files = result.diagnostics.map((d) => d.file);
    expect(files).toContain("src/main.rs");
    expect(files).toContain("src/lib.rs");
    expect(files).toContain("src/utils.rs");

    // Verify individual diagnostics by order
    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.diagnostics[0].message).toBe("mismatched types");
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].message).toBe("unused variable `x`");
    expect(result.diagnostics[2].severity).toBe("error");
    expect(result.diagnostics[2].message).toBe("cannot find value `y`");
    expect(result.diagnostics[3].severity).toBe("warning");
    expect(result.diagnostics[3].message).toBe("unused import: `HashMap`");
  });

  it("clean build: success true, zero diagnostics", () => {
    const result = parseCargoBuildJson(BUILD_CLEAN, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("error with code (E0308) preserved in structured output", () => {
    const result = parseCargoBuildJson(BUILD_ERROR_WITH_CODE, 101);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe("E0308");
    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.diagnostics[0].line).toBe(42);
    expect(result.diagnostics[0].column).toBe(18);
    expect(result.diagnostics[0].message).toBe("expected `bool`, found `i32`");
  });

  it("warning without code: code field is undefined", () => {
    const result = parseCargoBuildJson(BUILD_MULTIPLE_MIXED, 101);

    // Second diagnostic is "unused variable `x`" with no code
    const noCodeDiag = result.diagnostics[1];
    expect(noCodeDiag.code).toBeUndefined();
    expect(noCodeDiag.severity).toBe("warning");
  });

  it("non-compiler-message lines are ignored", () => {
    const stdout = [
      nonDiagnosticLine("compiler-artifact"),
      nonDiagnosticLine("build-script-executed"),
      nonDiagnosticLine("build-finished"),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("note and help severity levels are preserved", () => {
    const result = parseCargoBuildJson(BUILD_NOTE_SEVERITY, 101);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0].severity).toBe("note");
    expect(result.diagnostics[0].message).toBe("required by a bound in `Foo`");
    expect(result.diagnostics[1].severity).toBe("help");
    expect(result.diagnostics[1].message).toBe("consider adding a `#[derive(Debug)]`");
  });
});

// ---------------------------------------------------------------------------
// Test fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoTestOutput", () => {
  it("all tests pass: every test name and status captured", () => {
    const result = parseCargoTestOutput(TEST_ALL_PASS, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.ignored).toBe(0);
    expect(result.tests).toHaveLength(3);

    // Verify all test names are preserved
    const names = result.tests.map((t) => t.name);
    expect(names).toContain("tests::test_add");
    expect(names).toContain("tests::test_sub");
    expect(names).toContain("tests::test_mul");

    // All statuses should be "ok"
    for (const test of result.tests) {
      expect(test.status).toBe("ok");
    }
  });

  it("mix of pass/fail/ignored: all statuses preserved with correct counts", () => {
    const result = parseCargoTestOutput(TEST_MIXED, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(5);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.ignored).toBe(1);
    expect(result.tests).toHaveLength(5);

    // Verify specific test statuses
    const byName = Object.fromEntries(result.tests.map((t) => [t.name, t.status]));
    expect(byName["tests::test_add"]).toBe("ok");
    expect(byName["tests::test_sub"]).toBe("FAILED");
    expect(byName["tests::test_mul"]).toBe("ok");
    expect(byName["tests::test_div"]).toBe("FAILED");
    expect(byName["tests::test_slow"]).toBe("ignored");
  });

  it("single test failure: captures the failing test", () => {
    const result = parseCargoTestOutput(TEST_SINGLE_FAILURE, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.ignored).toBe(0);

    expect(result.tests[0].name).toBe("tests::test_panic");
    expect(result.tests[0].status).toBe("FAILED");
  });

  it("empty test output: zero tests, success based on exit code", () => {
    const result = parseCargoTestOutput(TEST_EMPTY, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.ignored).toBe(0);
    expect(result.tests).toEqual([]);
  });

  it("all ignored tests: correct ignored count, success true", () => {
    const result = parseCargoTestOutput(TEST_ALL_IGNORED, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.ignored).toBe(2);

    for (const test of result.tests) {
      expect(test.status).toBe("ignored");
    }
  });

  it("noise lines (failures section, thread output) do not produce false test entries", () => {
    const result = parseCargoTestOutput(TEST_SINGLE_FAILURE, 101);

    // Only the actual "test ... FAILED" line should produce a test entry,
    // not the "failures:" section or panic message
    expect(result.tests).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Clippy fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoClippyJson", () => {
  it("clippy warnings with codes: all codes preserved", () => {
    const result = parseCargoClippyJson(CLIPPY_WARNINGS_WITH_CODES);

    expect(result.total).toBe(2);
    expect(result.warnings).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.diagnostics).toHaveLength(2);

    expect(result.diagnostics[0].code).toBe("clippy::needless_return");
    expect(result.diagnostics[0].message).toBe("unneeded `return` statement");
    expect(result.diagnostics[0].file).toBe("src/main.rs");
    expect(result.diagnostics[0].line).toBe(5);
    expect(result.diagnostics[0].column).toBe(5);

    expect(result.diagnostics[1].code).toBe("clippy::redundant_closure");
    expect(result.diagnostics[1].message).toBe("this could be simplified");
    expect(result.diagnostics[1].file).toBe("src/lib.rs");
  });

  it("mix of errors and warnings: counts are correct", () => {
    const result = parseCargoClippyJson(CLIPPY_MIXED);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);

    // Verify individual severities
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    expect(errors).toHaveLength(1);
    expect(warnings).toHaveLength(2);

    expect(errors[0].code).toBe("E0308");
    expect(errors[0].message).toBe("mismatched types");
  });

  it("clean clippy output: zero diagnostics", () => {
    const result = parseCargoClippyJson(CLIPPY_CLEAN);

    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("multiple diagnostics in same file: all captured with distinct locations", () => {
    const result = parseCargoClippyJson(CLIPPY_SAME_FILE);

    expect(result.total).toBe(4);
    expect(result.diagnostics).toHaveLength(4);

    // All diagnostics should reference the same file
    for (const diag of result.diagnostics) {
      expect(diag.file).toBe("src/main.rs");
    }

    // Verify distinct line numbers
    const lines = result.diagnostics.map((d) => d.line);
    expect(lines).toEqual([5, 18, 30, 45]);

    // Verify distinct columns
    const columns = result.diagnostics.map((d) => d.column);
    expect(columns).toEqual([5, 12, 9, 3]);

    // Verify codes are all preserved
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("clippy::needless_return");
    expect(codes).toContain("clippy::redundant_closure");
    expect(codes).toContain("clippy::unused_mut");
    expect(codes).toContain("E0425");
  });

  it("warning without code: code field is undefined", () => {
    const result = parseCargoClippyJson(CLIPPY_MIXED);

    // The third diagnostic ("unused variable `x`") has no code
    const noCodeDiag = result.diagnostics.find((d) => d.message === "unused variable `x`");
    expect(noCodeDiag).toBeDefined();
    expect(noCodeDiag!.code).toBeUndefined();
  });

  it("invalid JSON lines are silently skipped", () => {
    const stdout = [
      "this is not valid JSON",
      compilerMessage("warning", "unused variable", "src/main.rs", 1, 1, "unused_variables"),
      "{malformed json: true",
    ].join("\n");

    const result = parseCargoClippyJson(stdout);

    expect(result.total).toBe(1);
    expect(result.diagnostics[0].message).toBe("unused variable");
  });
});

// ---------------------------------------------------------------------------
// Run fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoRunOutput", () => {
  it("successful run preserves stdout, stderr, and exit code", () => {
    const result = parseCargoRunOutput("Hello, world!\nLine 2\n", "Compiling...\n", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, world!\nLine 2\n");
    expect(result.stderr).toBe("Compiling...\n");
  });

  it("failed run preserves non-zero exit code", () => {
    const result = parseCargoRunOutput("", "error: cannot find binary", 101);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(101);
    expect(result.stderr).toContain("cannot find binary");
  });

  it("runtime panic captured in stderr with non-zero exit", () => {
    const stderr = [
      "thread 'main' panicked at 'index out of bounds: the len is 0 but the index is 0'",
      "note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace",
    ].join("\n");

    const result = parseCargoRunOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("panicked at");
    expect(result.stderr).toContain("index out of bounds");
  });
});

// ---------------------------------------------------------------------------
// Add fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoAddOutput", () => {
  it("multiple packages: all names and versions preserved", () => {
    const stderr = [
      "    Updating crates.io index",
      "      Adding serde v1.0.217 to dependencies",
      "      Adding serde_json v1.0.135 to dependencies",
      "      Adding tokio v1.41.1 to dependencies",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.added).toHaveLength(3);

    const names = result.added.map((p) => p.name);
    expect(names).toContain("serde");
    expect(names).toContain("serde_json");
    expect(names).toContain("tokio");

    const versions = result.added.map((p) => p.version);
    expect(versions).toContain("1.0.217");
    expect(versions).toContain("1.0.135");
    expect(versions).toContain("1.41.1");
  });

  it("dev dependency: same parsing, version preserved", () => {
    const stderr = "      Adding mockall v0.13.1 to dev-dependencies";
    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.total).toBe(1);
    expect(result.added[0].name).toBe("mockall");
    expect(result.added[0].version).toBe("0.13.1");
  });

  it("non-Adding lines (Updating, Locking) are ignored", () => {
    const stderr = [
      "    Updating crates.io index",
      "      Locking 25 packages to latest Rust 1.82.0 compatible versions",
      "      Adding serde v1.0.217 to dependencies",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);
    expect(result.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Remove fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoRemoveOutput", () => {
  it("multiple packages: all names preserved", () => {
    const stderr = [
      "      Removing serde from dependencies",
      "      Removing tokio from dependencies",
      "      Removing anyhow from dependencies",
    ].join("\n");

    const result = parseCargoRemoveOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.removed).toEqual(["serde", "tokio", "anyhow"]);
  });

  it("dev dependency removal: name preserved", () => {
    const stderr = "      Removing mockall from dev-dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);

    expect(result.total).toBe(1);
    expect(result.removed).toEqual(["mockall"]);
  });
});

// ---------------------------------------------------------------------------
// Fmt fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoFmtOutput", () => {
  it("check mode: all unformatted files captured", () => {
    const stdout = [
      "Diff in src/main.rs at line 1:",
      "+fn main() {",
      "-fn main(){",
      "Diff in src/lib.rs at line 5:",
      "+    let x = 1;",
      "-let x = 1;",
      "Diff in src/utils.rs at line 10:",
      "+    fn helper() -> bool {",
      "-fn helper() -> bool{",
    ].join("\n");

    const result = parseCargoFmtOutput(stdout, "", 1, true);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(3);
    expect(result.files).toContain("src/main.rs");
    expect(result.files).toContain("src/lib.rs");
    expect(result.files).toContain("src/utils.rs");
  });

  it("check mode clean: no files listed", () => {
    const result = parseCargoFmtOutput("", "", 0, true);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("fix mode: returns empty files (formatting happens in-place)", () => {
    const result = parseCargoFmtOutput("", "", 0, false);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Doc fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseCargoDocOutput", () => {
  it("doc with warnings: all warnings counted", () => {
    const stderr = [
      "   Compiling myapp v0.1.0",
      " Documenting myapp v0.1.0",
      "warning: missing docs for function",
      "  --> src/lib.rs:10:1",
      "warning: missing docs for struct",
      "  --> src/lib.rs:20:1",
      "warning: missing docs for module",
      "  --> src/lib.rs:1:1",
      "warning: 3 warnings emitted",
    ].join("\n");

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.success).toBe(true);
    // The "warning:" lines that match the pattern (colon or bracket after "warning")
    expect(result.warnings).toBe(3);
  });

  it("clean doc: zero warnings", () => {
    const stderr = [
      "   Compiling myapp v0.1.0",
      " Documenting myapp v0.1.0",
      "    Finished `dev` profile in 1.5s",
    ].join("\n");

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(0);
  });

  it("failed doc: success is false", () => {
    const stderr = "error[E0308]: mismatched types\n  --> src/main.rs:5:10";

    const result = parseCargoDocOutput(stderr, 101);

    expect(result.success).toBe(false);
  });
});
