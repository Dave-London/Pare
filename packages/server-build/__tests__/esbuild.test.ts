import { describe, it, expect } from "vitest";
import { parseEsbuildOutput } from "../src/lib/parsers.js";
import { formatEsbuild } from "../src/lib/formatters.js";
import type { EsbuildResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ESBUILD_SUCCESS_EMPTY = "";

const ESBUILD_HEADER_ERROR = [
  '✘ [ERROR] Could not resolve "./missing"',
  "    src/index.ts:3:21:",
  "",
  "1 error",
].join("\n");

const ESBUILD_HEADER_MULTIPLE_ERRORS = [
  '✘ [ERROR] Could not resolve "./missing"',
  "    src/index.ts:3:21:",
  "",
  '✘ [ERROR] Expected ";" but found "}"',
  "    src/app.ts:10:5:",
  "",
  "2 errors",
].join("\n");

const ESBUILD_HEADER_WARNING = [
  "▲ [WARNING] This import is never used",
  "    src/utils.ts:1:8:",
  "",
].join("\n");

const ESBUILD_HEADER_MIXED = [
  "▲ [WARNING] This import is never used",
  "    src/utils.ts:1:8:",
  "",
  '✘ [ERROR] Cannot assign to "x" because it is a constant',
  "    src/index.ts:15:3:",
  "",
  "1 warning and 1 error",
].join("\n");

const ESBUILD_INLINE_ERROR = `> src/index.ts:10:5: error: Could not resolve "./missing"`;

const ESBUILD_INLINE_WARNING = `> src/index.ts:5:1: warning: This import is never used`;

const ESBUILD_INLINE_MIXED = [
  `> src/index.ts:10:5: error: Could not resolve "./missing"`,
  `> src/utils.ts:3:8: warning: This import is never used`,
  `> src/app.ts:20:3: error: Unexpected token`,
].join("\n");

const ESBUILD_ERROR_NO_LOCATION = [
  '✘ [ERROR] No matching export in "node_modules/missing/index.js"',
  "",
].join("\n");

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseEsbuildOutput", () => {
  it("parses successful build with no output", () => {
    const result = parseEsbuildOutput("", ESBUILD_SUCCESS_EMPTY, 0, 0.3);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.duration).toBe(0.3);
  });

  it("parses header-style single error with location", () => {
    const result = parseEsbuildOutput("", ESBUILD_HEADER_ERROR, 1, 0.1);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe("src/index.ts");
    expect(result.errors[0].line).toBe(3);
    expect(result.errors[0].column).toBe(21);
    expect(result.errors[0].message).toBe('Could not resolve "./missing"');
    expect(result.warnings).toEqual([]);
  });

  it("parses header-style multiple errors", () => {
    const result = parseEsbuildOutput("", ESBUILD_HEADER_MULTIPLE_ERRORS, 1, 0.2);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toBe('Could not resolve "./missing"');
    expect(result.errors[0].file).toBe("src/index.ts");
    expect(result.errors[1].message).toBe('Expected ";" but found "}"');
    expect(result.errors[1].file).toBe("src/app.ts");
    expect(result.errors[1].line).toBe(10);
  });

  it("parses header-style warning with ▲ marker", () => {
    const result = parseEsbuildOutput("", ESBUILD_HEADER_WARNING, 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].file).toBe("src/utils.ts");
    expect(result.warnings[0].line).toBe(1);
    expect(result.warnings[0].message).toBe("This import is never used");
  });

  it("parses header-style mixed errors and ▲ warnings", () => {
    const result = parseEsbuildOutput("", ESBUILD_HEADER_MIXED, 1, 0.5);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors[0].message).toContain("Cannot assign");
    expect(result.errors[0].file).toBe("src/index.ts");
    expect(result.errors[0].line).toBe(15);
    expect(result.warnings[0].message).toContain("never used");
    expect(result.warnings[0].file).toBe("src/utils.ts");
  });

  it("parses header-style warning with X marker", () => {
    const stderr = ["X [WARNING] This import is never used", "    src/utils.ts:1:8:", ""].join(
      "\n",
    );
    const result = parseEsbuildOutput("", stderr, 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].file).toBe("src/utils.ts");
    expect(result.warnings[0].line).toBe(1);
    expect(result.warnings[0].message).toBe("This import is never used");
  });

  it("parses header-style mixed errors and warnings", () => {
    // Use X markers that the regex can match
    const stderr = [
      "X [WARNING] This import is never used",
      "    src/utils.ts:1:8:",
      "",
      'X [ERROR] Cannot assign to "x" because it is a constant',
      "    src/index.ts:15:3:",
      "",
    ].join("\n");
    const result = parseEsbuildOutput("", stderr, 1, 0.5);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors[0].message).toContain("Cannot assign");
    expect(result.warnings[0].message).toContain("never used");
  });

  it("parses inline-style error", () => {
    const result = parseEsbuildOutput("", ESBUILD_INLINE_ERROR, 1, 0.1);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe("src/index.ts");
    expect(result.errors[0].line).toBe(10);
    expect(result.errors[0].column).toBe(5);
    expect(result.errors[0].message).toBe('Could not resolve "./missing"');
  });

  it("parses inline-style warning", () => {
    const result = parseEsbuildOutput("", ESBUILD_INLINE_WARNING, 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].file).toBe("src/index.ts");
    expect(result.warnings[0].line).toBe(5);
    expect(result.warnings[0].message).toBe("This import is never used");
  });

  it("parses inline-style mixed errors and warnings", () => {
    const result = parseEsbuildOutput("", ESBUILD_INLINE_MIXED, 1, 0.2);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors[0].file).toBe("src/index.ts");
    expect(result.errors[1].file).toBe("src/app.ts");
    expect(result.warnings[0].file).toBe("src/utils.ts");
  });

  it("parses error without location info", () => {
    // Use X marker version
    const stderr = ['X [ERROR] No matching export in "node_modules/missing/index.js"', ""].join(
      "\n",
    );
    const result = parseEsbuildOutput("", stderr, 1, 0.1);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBeUndefined();
    expect(result.errors[0].line).toBeUndefined();
    expect(result.errors[0].message).toContain("No matching export");
  });

  it("detects output files from stdout", () => {
    const stdout = "dist/index.js\ndist/index.css\n";
    const result = parseEsbuildOutput(stdout, "", 0, 0.3);

    expect(result.success).toBe(true);
    expect(result.outputFiles).toEqual(["dist/index.js", "dist/index.css"]);
  });

  it("returns undefined outputFiles when no files detected", () => {
    const result = parseEsbuildOutput("", "", 0, 0.1);
    expect(result.outputFiles).toBeUndefined();
  });

  it("preserves duration", () => {
    const result = parseEsbuildOutput("", "", 0, 2.345);
    expect(result.duration).toBe(2.345);
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe("formatEsbuild", () => {
  it("formats successful build with no issues", () => {
    const data: EsbuildResult = {
      success: true,
      errors: [],
      warnings: [],
      duration: 0.5,
    };
    expect(formatEsbuild(data)).toBe("esbuild: build succeeded in 0.5s");
  });

  it("formats successful build with output files", () => {
    const data: EsbuildResult = {
      success: true,
      errors: [],
      warnings: [],
      outputFiles: ["dist/index.js", "dist/index.css"],
      duration: 1.2,
    };
    const output = formatEsbuild(data);
    expect(output).toContain("build succeeded in 1.2s");
    expect(output).toContain("2 output files");
  });

  it("formats failed build with errors", () => {
    const data: EsbuildResult = {
      success: false,
      errors: [
        { file: "src/index.ts", line: 10, column: 5, message: 'Could not resolve "./missing"' },
      ],
      warnings: [],
      duration: 0.1,
    };
    const output = formatEsbuild(data);
    expect(output).toContain("build failed");
    expect(output).toContain("1 errors");
    expect(output).toContain("src/index.ts:10:5");
    expect(output).toContain("Could not resolve");
  });

  it("formats build with warnings only", () => {
    const data: EsbuildResult = {
      success: true,
      errors: [],
      warnings: [{ file: "src/utils.ts", line: 1, message: "Unused import" }],
      duration: 0.3,
    };
    const output = formatEsbuild(data);
    expect(output).toContain("build succeeded");
    expect(output).toContain("1 warnings");
    expect(output).toContain("src/utils.ts:1");
    expect(output).toContain("Unused import");
  });

  it("formats error without file location", () => {
    const data: EsbuildResult = {
      success: false,
      errors: [{ message: "Install esbuild first" }],
      warnings: [],
      duration: 0.0,
    };
    const output = formatEsbuild(data);
    expect(output).toContain("ERROR: Install esbuild first");
  });
});
