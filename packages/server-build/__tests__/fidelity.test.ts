/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw tsc and build command output.
 *
 * These tests use realistic fixtures to ensure parsers extract every
 * diagnostic field, error/warning count, and metadata without data loss.
 */
import { describe, it, expect } from "vitest";
import { parseTscOutput, parseBuildCommandOutput } from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TSC_SINGLE_ERROR = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;

const TSC_MULTIPLE_ERRORS_SAME_FILE = [
  "src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
  "src/index.ts(15,10): error TS7006: Parameter 'x' implicitly has an 'any' type.",
  "src/index.ts(22,3): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'.",
].join("\n");

const TSC_ERRORS_ACROSS_FILES = [
  "src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
  "src/utils.ts(3,1): error TS2307: Cannot find module './missing'.",
  "src/helpers/math.ts(45,12): error TS2339: Property 'foo' does not exist on type 'Bar'.",
].join("\n");

const TSC_WARNING_ONLY = `src/utils.ts(3,1): warning TS6133: 'unused' is declared but its value is never read.`;

const TSC_MIXED_ERRORS_AND_WARNINGS = [
  "src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
  "src/index.ts(15,10): error TS7006: Parameter 'x' implicitly has an 'any' type.",
  "src/utils.ts(3,1): warning TS6133: 'unused' is declared but its value is never read.",
  "src/utils.ts(8,5): warning TS6133: 'temp' is declared but its value is never read.",
  "src/app.ts(100,20): error TS2304: Cannot find name 'globalConfig'.",
].join("\n");

const TSC_MULTILINE_VARIOUS = [
  "Version 5.7.2",
  "src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
  "src/index.ts(15,10): error TS7006: Parameter 'x' implicitly has an 'any' type.",
  "src/utils.ts(3,1): warning TS6133: 'unused' is declared but its value is never read.",
  "src/models/user.ts(22,7): error TS2416: Property 'name' in type 'Admin' is not assignable to the same property in base type 'User'.",
  "src/api/routes.ts(55,14): error TS2769: No overload matches this call.",
  "",
  "Found 4 errors and 1 warning in 4 files.",
].join("\n");

// ---------------------------------------------------------------------------
// tsc parser fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseTscOutput", () => {
  it("single error: preserves file, line, column, code, severity, message", () => {
    const result = parseTscOutput(TSC_SINGLE_ERROR, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toHaveLength(1);

    const diag = result.diagnostics[0];
    expect(diag.file).toBe("src/index.ts");
    expect(diag.line).toBe(10);
    expect(diag.column).toBe(5);
    expect(diag.code).toBe(2322);
    expect(diag.severity).toBe("error");
    expect(diag.message).toBe("Type 'string' is not assignable to type 'number'.");
  });

  it("multiple errors in same file: all diagnostics appear", () => {
    const result = parseTscOutput(TSC_MULTIPLE_ERRORS_SAME_FILE, "", 2);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(3);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toHaveLength(3);

    // All diagnostics should reference the same file
    for (const diag of result.diagnostics) {
      expect(diag.file).toBe("src/index.ts");
    }

    // Verify each line/column pair is captured correctly
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(5);
    expect(result.diagnostics[1].line).toBe(15);
    expect(result.diagnostics[1].column).toBe(10);
    expect(result.diagnostics[2].line).toBe(22);
    expect(result.diagnostics[2].column).toBe(3);
  });

  it("errors across multiple files: all files are represented", () => {
    const result = parseTscOutput(TSC_ERRORS_ACROSS_FILES, "", 2);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(3);

    const files = result.diagnostics.map((d) => d.file);
    expect(files).toContain("src/index.ts");
    expect(files).toContain("src/utils.ts");
    expect(files).toContain("src/helpers/math.ts");
  });

  it("warning diagnostic: severity correctly mapped", () => {
    // Warnings with exit code 0 (tsc --noEmit may still exit 0 for warnings-only)
    const result = parseTscOutput(TSC_WARNING_ONLY, "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(1);

    const diag = result.diagnostics[0];
    expect(diag.severity).toBe("warning");
    expect(diag.file).toBe("src/utils.ts");
    expect(diag.code).toBe(6133);
    expect(diag.message).toBe("'unused' is declared but its value is never read.");
  });

  it("mixed errors and warnings: counts are correct", () => {
    const result = parseTscOutput(TSC_MIXED_ERRORS_AND_WARNINGS, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(5);
    expect(result.errors).toBe(3);
    expect(result.warnings).toBe(2);

    // Verify individual severities
    const errorDiags = result.diagnostics.filter((d) => d.severity === "error");
    const warningDiags = result.diagnostics.filter((d) => d.severity === "warning");
    expect(errorDiags).toHaveLength(3);
    expect(warningDiags).toHaveLength(2);
  });

  it("clean compilation: success true, diagnostics empty", () => {
    const result = parseTscOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("error code preservation: TS2322, TS7006, TS6133, TS2304 all captured", () => {
    const result = parseTscOutput(TSC_MIXED_ERRORS_AND_WARNINGS, "", 2);

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain(2322);
    expect(codes).toContain(7006);
    expect(codes).toContain(6133);
    expect(codes).toContain(2304);
  });

  it("multiline fixture with various error types: all diagnostics extracted", () => {
    const result = parseTscOutput(TSC_MULTILINE_VARIOUS, "", 2);

    // Should ignore version line, empty line, and summary line
    expect(result.total).toBe(5);
    expect(result.errors).toBe(4);
    expect(result.warnings).toBe(1);

    // Verify specific error codes from the multiline fixture
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain(2322);
    expect(codes).toContain(7006);
    expect(codes).toContain(6133);
    expect(codes).toContain(2416);
    expect(codes).toContain(2769);

    // Verify files across multiple directories
    const files = result.diagnostics.map((d) => d.file);
    expect(files).toContain("src/index.ts");
    expect(files).toContain("src/utils.ts");
    expect(files).toContain("src/models/user.ts");
    expect(files).toContain("src/api/routes.ts");
  });

  it("diagnostics from stderr are also captured", () => {
    const stderr = "src/config.ts(1,1): error TS2307: Cannot find module 'missing-pkg'.";
    const result = parseTscOutput("", stderr, 2);

    expect(result.total).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.diagnostics[0].file).toBe("src/config.ts");
    expect(result.diagnostics[0].code).toBe(2307);
  });
});

// ---------------------------------------------------------------------------
// build command parser fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseBuildCommandOutput", () => {
  it("build success: success true, empty errors and warnings", () => {
    const stdout = "Build completed successfully\nOutput written to dist/";
    const result = parseBuildCommandOutput(stdout, "", 0, 4.2);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("build failure with error lines: all errors captured", () => {
    const stdout = [
      "Compiling src/index.ts...",
      "Error: Cannot resolve module './missing'",
      "Error: Unexpected token in src/broken.ts",
      "Build failed",
    ].join("\n");
    const stderr = "Fatal error: compilation aborted";
    const result = parseBuildCommandOutput(stdout, stderr, 1, 2.5);

    expect(result.success).toBe(false);
    // "Error:" lines from stdout + "error" line from stderr + "Build failed" is not an error (no "error" substring)
    // Let's check: "Error: Cannot resolve..." has "error", "Error: Unexpected..." has "error",
    // "Fatal error:..." has "error"
    expect(result.errors.length).toBeGreaterThanOrEqual(3);

    // Verify each error line content is preserved (trimmed)
    const errorTexts = result.errors.join(" ");
    expect(errorTexts).toContain("Cannot resolve module");
    expect(errorTexts).toContain("Unexpected token");
    expect(errorTexts).toContain("Fatal error");
  });

  it("build with warning lines: all warnings captured", () => {
    const stdout = [
      "Compiling...",
      "Warning: 'fs' module is deprecated in browser context",
      "WARN: Large bundle size detected (512KB)",
      "Build completed with warnings",
    ].join("\n");
    const result = parseBuildCommandOutput(stdout, "", 0, 3.1);

    expect(result.success).toBe(true);
    // "Warning:" and "WARN:" both contain "warn"
    // "Build completed with warnings" also contains "warn"
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);

    const warningTexts = result.warnings.join(" ");
    expect(warningTexts).toContain("deprecated in browser context");
    expect(warningTexts).toContain("Large bundle size");
  });

  it("duration is preserved exactly", () => {
    const result = parseBuildCommandOutput("done", "", 0, 7.891);
    expect(result.duration).toBe(7.891);
  });

  it("lines matching '0 errors' are excluded from errors array", () => {
    const stdout = "Build completed: 0 errors, 0 warnings";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("lines matching '0 warnings' are excluded from warnings array", () => {
    const stdout = "Finished with 0 warnings";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
