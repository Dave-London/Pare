import { describe, it, expect } from "vitest";
import { formatCargoBuild, formatCargoTest, formatCargoClippy } from "../src/lib/formatters.js";
import type { CargoBuildResult, CargoTestResult, CargoClippyResult } from "../src/schemas/index.js";

describe("formatCargoBuild", () => {
  it("formats successful build with no diagnostics", () => {
    const data: CargoBuildResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatCargoBuild(data)).toBe("cargo build: success, no diagnostics.");
  });

  it("formats successful build with warnings", () => {
    const data: CargoBuildResult = {
      success: true,
      diagnostics: [
        {
          file: "src/main.rs",
          line: 5,
          column: 9,
          severity: "warning",
          code: "unused_variables",
          message: "unused variable: `x`",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
    };
    const output = formatCargoBuild(data);
    expect(output).toContain("cargo build: success (0 errors, 1 warnings)");
    expect(output).toContain("src/main.rs:5:9 warning [unused_variables]: unused variable: `x`");
  });

  it("formats failed build with errors", () => {
    const data: CargoBuildResult = {
      success: false,
      diagnostics: [
        {
          file: "src/lib.rs",
          line: 10,
          column: 1,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
        },
        {
          file: "src/lib.rs",
          line: 20,
          column: 5,
          severity: "error",
          message: "cannot find value `foo`",
        },
      ],
      total: 2,
      errors: 2,
      warnings: 0,
    };
    const output = formatCargoBuild(data);
    expect(output).toContain("cargo build: failed (2 errors, 0 warnings)");
    expect(output).toContain("src/lib.rs:10:1 error [E0308]: mismatched types");
    expect(output).toContain("src/lib.rs:20:5 error: cannot find value `foo`");
  });
});

describe("formatCargoTest", () => {
  it("formats passing test results", () => {
    const data: CargoTestResult = {
      success: true,
      tests: [
        { name: "test_add", status: "ok" },
        { name: "test_sub", status: "ok" },
        { name: "test_slow", status: "ignored" },
      ],
      total: 3,
      passed: 2,
      failed: 0,
      ignored: 1,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: ok. 2 passed; 0 failed; 1 ignored");
    expect(output).toContain("ok      test_add");
    expect(output).toContain("ok      test_sub");
    expect(output).toContain("ignored test_slow");
  });

  it("formats failing test results", () => {
    const data: CargoTestResult = {
      success: false,
      tests: [
        { name: "test_valid", status: "ok" },
        { name: "test_broken", status: "FAILED" },
      ],
      total: 2,
      passed: 1,
      failed: 1,
      ignored: 0,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: FAILED. 1 passed; 1 failed; 0 ignored");
    expect(output).toContain("ok      test_valid");
    expect(output).toContain("FAILED  test_broken");
  });

  it("formats empty test suite", () => {
    const data: CargoTestResult = {
      success: true,
      tests: [],
      total: 0,
      passed: 0,
      failed: 0,
      ignored: 0,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: ok. 0 passed; 0 failed; 0 ignored");
  });
});

describe("formatCargoClippy", () => {
  it("formats clean clippy result", () => {
    const data: CargoClippyResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatCargoClippy(data)).toBe("clippy: no warnings.");
  });

  it("formats clippy result with warnings", () => {
    const data: CargoClippyResult = {
      diagnostics: [
        {
          file: "src/main.rs",
          line: 15,
          column: 5,
          severity: "warning",
          code: "clippy::needless_return",
          message: "unneeded `return` statement",
        },
        {
          file: "src/lib.rs",
          line: 8,
          column: 1,
          severity: "warning",
          code: "clippy::unused_imports",
          message: "unused import: `std::io`",
        },
      ],
      total: 2,
      errors: 0,
      warnings: 2,
    };
    const output = formatCargoClippy(data);
    expect(output).toContain("clippy: 0 errors, 2 warnings");
    expect(output).toContain(
      "src/main.rs:15:5 warning [clippy::needless_return]: unneeded `return` statement",
    );
    expect(output).toContain(
      "src/lib.rs:8:1 warning [clippy::unused_imports]: unused import: `std::io`",
    );
  });
});
