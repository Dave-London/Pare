/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw tsc and build command output.
 *
 * These tests use realistic fixtures to ensure parsers extract every
 * diagnostic field, error/warning count, and metadata without data loss.
 */
import { describe, it, expect } from "vitest";
import {
  parseTscOutput,
  parseBuildCommandOutput,
  parseEsbuildOutput,
  parseViteBuildOutput,
  parseWebpackOutput,
} from "../src/lib/parsers.js";

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

// ---------------------------------------------------------------------------
// esbuild fidelity fixtures
// ---------------------------------------------------------------------------

const ESBUILD_REALISTIC_ERROR = [
  '✘ [ERROR] Could not resolve "react"',
  "    src/App.tsx:1:18:",
  "",
  "      1 │ import React from 'react';",
  "        ╵                   ~~~~~~~",
  "",
  "  You can mark the path \"react\" as external to exclude it from the bundle. You",
  '  can also use the "alias" feature to substitute a different package for this one.',
  "",
  '✘ [ERROR] Expected ";" but found "}"',
  "    src/utils.ts:42:10:",
  "",
  "      42 │ const x = }",
  "         ╵           ^",
  "",
  "▲ [WARNING] This import is never used [unused-imports]",
  "    src/helpers.ts:3:7:",
  "",
  "      3 │ import { unused } from './lib';",
  "        ╵        ~~~~~~~~",
  "",
  "2 errors and 1 warning",
].join("\n");

const ESBUILD_REALISTIC_SUCCESS_WITH_OUTPUT = [
  "dist/bundle.js",
  "dist/bundle.css",
  "dist/bundle.js.map",
].join("\n");

// ---------------------------------------------------------------------------
// esbuild parser fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseEsbuildOutput", () => {
  it("realistic multi-error + warning output: all diagnostics extracted", () => {
    const result = parseEsbuildOutput(
      ESBUILD_REALISTIC_SUCCESS_WITH_OUTPUT,
      ESBUILD_REALISTIC_ERROR,
      1,
      0.4,
    );

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);

    // First error
    expect(result.errors[0].file).toBe("src/App.tsx");
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[0].column).toBe(18);
    expect(result.errors[0].message).toBe('Could not resolve "react"');

    // Second error
    expect(result.errors[1].file).toBe("src/utils.ts");
    expect(result.errors[1].line).toBe(42);
    expect(result.errors[1].column).toBe(10);
    expect(result.errors[1].message).toBe('Expected ";" but found "}"');

    // Warning with ▲ marker
    expect(result.warnings[0].file).toBe("src/helpers.ts");
    expect(result.warnings[0].line).toBe(3);
    expect(result.warnings[0].message).toBe("This import is never used [unused-imports]");
  });

  it("output files section: all JS/CSS/map files detected", () => {
    const result = parseEsbuildOutput(ESBUILD_REALISTIC_SUCCESS_WITH_OUTPUT, "", 0, 0.2);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.outputFiles).toEqual(["dist/bundle.js", "dist/bundle.css", "dist/bundle.js.map"]);
  });

  it("error without location preserves full message", () => {
    const stderr = [
      '✘ [ERROR] No matching export in "node_modules/lodash-es/lodash.js" for import "default"',
      "",
    ].join("\n");
    const result = parseEsbuildOutput("", stderr, 1, 0.1);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBeUndefined();
    expect(result.errors[0].line).toBeUndefined();
    expect(result.errors[0].column).toBeUndefined();
    expect(result.errors[0].message).toBe(
      'No matching export in "node_modules/lodash-es/lodash.js" for import "default"',
    );
  });

  it("duration is preserved exactly", () => {
    const result = parseEsbuildOutput("", "", 0, 3.142);
    expect(result.duration).toBe(3.142);
  });
});

// ---------------------------------------------------------------------------
// vite-build fidelity fixtures
// ---------------------------------------------------------------------------

const VITE_REALISTIC_BUILD = [
  "vite v6.3.5 building for production...",
  "transforming...",
  "✓ 127 modules transformed.",
  "rendering chunks...",
  "computing gzip size...",
  "dist/index.html                    0.46 kB │ gzip:  0.30 kB",
  "dist/assets/logo-BQ7r2YGf.svg      4.13 kB │ gzip:  2.05 kB",
  "dist/assets/index-DiwrgTda.css     28.15 kB │ gzip:  5.23 kB",
  "dist/assets/vendor-C3n0f3kY.js    142.05 kB │ gzip: 45.12 kB",
  "dist/assets/index-BbVSiOz0.js      52.31 kB │ gzip: 16.89 kB",
  "✓ built in 2.14s",
].join("\n");

// ---------------------------------------------------------------------------
// vite-build parser fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseViteBuildOutput", () => {
  it("realistic vite build: all output files with sizes preserved", () => {
    const result = parseViteBuildOutput(VITE_REALISTIC_BUILD, "", 0, 2.1);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.outputs).toHaveLength(5);

    // Verify each file and size is captured
    expect(result.outputs[0].file).toBe("dist/index.html");
    expect(result.outputs[0].size).toBe("0.46 kB");

    expect(result.outputs[1].file).toBe("dist/assets/logo-BQ7r2YGf.svg");
    expect(result.outputs[1].size).toBe("4.13 kB");

    expect(result.outputs[2].file).toBe("dist/assets/index-DiwrgTda.css");
    expect(result.outputs[2].size).toBe("28.15 kB");

    expect(result.outputs[3].file).toBe("dist/assets/vendor-C3n0f3kY.js");
    expect(result.outputs[3].size).toBe("142.05 kB");

    expect(result.outputs[4].file).toBe("dist/assets/index-BbVSiOz0.js");
    expect(result.outputs[4].size).toBe("52.31 kB");
  });

  it("vite header lines are not treated as output files", () => {
    const result = parseViteBuildOutput(VITE_REALISTIC_BUILD, "", 0, 2.1);

    // None of the header/status lines should appear as output files
    const files = result.outputs.map((o) => o.file);
    for (const f of files) {
      expect(f).not.toMatch(/^vite /);
      expect(f).not.toMatch(/^transforming/);
      expect(f).not.toMatch(/^rendering/);
      expect(f).not.toMatch(/^computing/);
    }
  });

  it("duration is preserved exactly", () => {
    const result = parseViteBuildOutput("", "", 0, 5.678);
    expect(result.duration).toBe(5.678);
  });
});

// ---------------------------------------------------------------------------
// webpack fidelity fixtures
// ---------------------------------------------------------------------------

const WEBPACK_REALISTIC_JSON = JSON.stringify({
  assets: [
    { name: "main.abc123.js", size: 153600 },
    { name: "vendor.def456.js", size: 512000 },
    { name: "runtime.ghi789.js", size: 2048 },
    { name: "styles.jkl012.css", size: 32768 },
  ],
  errors: [],
  warnings: [
    {
      message:
        "asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).\n" +
        "  Assets:\n" +
        "    vendor.def456.js (500 KiB)",
    },
  ],
  modules: [
    { name: "./src/index.ts" },
    { name: "./src/App.tsx" },
    { name: "./src/utils.ts" },
    { name: "./node_modules/react/index.js" },
    { name: "./node_modules/react-dom/index.js" },
  ],
});

const WEBPACK_REALISTIC_ERROR_JSON = JSON.stringify({
  assets: [],
  errors: [
    {
      message:
        "Module not found: Error: Can't resolve './components/Missing' in '/home/user/project/src'",
    },
    { message: "Module build failed (from ./node_modules/ts-loader/index.js):\nSyntaxError" },
  ],
  warnings: [
    "Critical dependency: the request of a dependency is an expression",
  ],
  modules: [
    { name: "./src/index.ts" },
    { name: "./src/broken.ts" },
  ],
});

// ---------------------------------------------------------------------------
// webpack parser fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseWebpackOutput", () => {
  it("realistic success JSON: all assets, warnings, and module count preserved", () => {
    const result = parseWebpackOutput(WEBPACK_REALISTIC_JSON, "", 0, 4.5);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(4.5);
    expect(result.errors).toEqual([]);

    // Assets
    expect(result.assets).toHaveLength(4);
    expect(result.assets[0]).toEqual({ name: "main.abc123.js", size: 153600 });
    expect(result.assets[1]).toEqual({ name: "vendor.def456.js", size: 512000 });
    expect(result.assets[2]).toEqual({ name: "runtime.ghi789.js", size: 2048 });
    expect(result.assets[3]).toEqual({ name: "styles.jkl012.css", size: 32768 });

    // Warnings
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("asset size limit");

    // Modules
    expect(result.modules).toBe(5);
  });

  it("realistic error JSON: errors and warnings both captured, success false", () => {
    const result = parseWebpackOutput(WEBPACK_REALISTIC_ERROR_JSON, "", 1, 2.0);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("Can't resolve './components/Missing'");
    expect(result.errors[1]).toContain("Module build failed");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Critical dependency");
    expect(result.modules).toBe(2);
  });

  it("webpack JSON with errors marks success=false even with exitCode 0", () => {
    const result = parseWebpackOutput(WEBPACK_REALISTIC_ERROR_JSON, "", 0, 1.0);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("duration is preserved exactly", () => {
    const result = parseWebpackOutput("{}", "", 0, 9.876);
    expect(result.duration).toBe(9.876);
  });
});
