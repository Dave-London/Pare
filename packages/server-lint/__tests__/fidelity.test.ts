/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from the raw ESLint and Prettier CLI output.
 *
 * These tests use realistic fixture data that mirrors actual CLI output,
 * then verify that parsed structured output retains every important field.
 */
import { describe, it, expect } from "vitest";
import {
  parseEslintJson,
  parsePrettierCheck,
  parseBiomeJson,
  parseBiomeFormat,
  parsePrettierWrite,
  parseStylelintJson,
  parseOxlintJson,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// ESLint fixtures
// ---------------------------------------------------------------------------

/** Single file with one error and one fixable warning. */
const eslintSingleFile = JSON.stringify([
  {
    filePath: "/project/src/index.ts",
    messages: [
      {
        ruleId: "no-unused-vars",
        severity: 2,
        message: "'x' is defined but never used",
        line: 10,
        column: 5,
        endLine: 10,
        endColumn: 6,
        fix: null,
      },
      {
        ruleId: "semi",
        severity: 1,
        message: "Missing semicolon",
        line: 15,
        column: 20,
        endLine: 15,
        endColumn: 20,
        fix: { range: [100, 100], text: ";" },
      },
    ],
    errorCount: 1,
    warningCount: 1,
  },
]);

/** Multiple files with various diagnostics. */
const eslintMultiFile = JSON.stringify([
  {
    filePath: "/project/src/index.ts",
    messages: [
      {
        ruleId: "no-unused-vars",
        severity: 2,
        message: "'x' is defined but never used",
        line: 10,
        column: 5,
        endLine: 10,
        endColumn: 6,
        fix: null,
      },
    ],
    errorCount: 1,
    warningCount: 0,
  },
  {
    filePath: "/project/src/utils.ts",
    messages: [
      {
        ruleId: "no-console",
        severity: 1,
        message: "Unexpected console statement",
        line: 3,
        column: 1,
        endLine: 3,
        endColumn: 20,
        fix: null,
      },
      {
        ruleId: "eqeqeq",
        severity: 2,
        message: "Expected '===' and instead saw '=='",
        line: 7,
        column: 10,
        endLine: 7,
        endColumn: 12,
        fix: { range: [50, 52], text: "===" },
      },
    ],
    errorCount: 1,
    warningCount: 1,
  },
  {
    filePath: "/project/src/helpers.ts",
    messages: [
      {
        ruleId: "prefer-const",
        severity: 1,
        message: "'y' is never reassigned. Use 'const' instead",
        line: 22,
        column: 7,
        endLine: 22,
        endColumn: 8,
        fix: { range: [200, 203], text: "const" },
      },
    ],
    errorCount: 0,
    warningCount: 1,
  },
]);

/** Clean output: file checked but zero violations. */
const eslintClean = JSON.stringify([
  {
    filePath: "/project/src/index.ts",
    messages: [],
    errorCount: 0,
    warningCount: 0,
  },
  {
    filePath: "/project/src/utils.ts",
    messages: [],
    errorCount: 0,
    warningCount: 0,
  },
]);

// ---------------------------------------------------------------------------
// Prettier fixtures
// ---------------------------------------------------------------------------

const prettierUnformatted = `Checking formatting...
[warn] src/index.ts
[warn] src/utils.ts
[warn] Code style issues found in 2 files. Forgot to run Prettier?`;

const prettierClean = `Checking formatting...
All matched files use Prettier code style!`;

// ---------------------------------------------------------------------------
// ESLint fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseEslintJson", () => {
  it("preserves file, line, severity, rule, and message for a single violation", () => {
    const result = parseEslintJson(eslintSingleFile);
    const diag = result.diagnostics[0];

    expect(diag.file).toBe("/project/src/index.ts");
    expect(diag.line).toBe(10);
    expect(diag.severity).toBe("error");
    expect(diag.rule).toBe("no-unused-vars");
    expect(diag.message).toBe("'x' is defined but never used");
  });

  it("captures all violations when a single file has multiple messages", () => {
    const result = parseEslintJson(eslintSingleFile);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0].rule).toBe("no-unused-vars");
    expect(result.diagnostics[1].rule).toBe("semi");
  });

  it("captures violations across multiple files", () => {
    const result = parseEslintJson(eslintMultiFile);
    const files = new Set(result.diagnostics.map((d) => d.file));

    expect(files.size).toBe(3);
    expect(files).toContain("/project/src/index.ts");
    expect(files).toContain("/project/src/utils.ts");
    expect(files).toContain("/project/src/helpers.ts");
  });

  it("maps severity 2 to 'error' and severity 1 to 'warning'", () => {
    const result = parseEslintJson(eslintMultiFile);

    // severity 2 entries
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");

    expect(errors.length).toBe(2); // no-unused-vars + eqeqeq
    expect(warnings.length).toBe(2); // no-console + prefer-const

    // Verify specific mappings
    expect(result.diagnostics.find((d) => d.rule === "no-unused-vars")!.severity).toBe("error");
    expect(result.diagnostics.find((d) => d.rule === "no-console")!.severity).toBe("warning");
  });

  it("returns empty diagnostics and zero counts for clean output", () => {
    const result = parseEslintJson(eslintClean);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
  });

  it("error and warning counts match the raw data", () => {
    const result = parseEslintJson(eslintMultiFile);

    // Raw data: 2 errors (no-unused-vars sev 2, eqeqeq sev 2), 2 warnings (no-console sev 1, prefer-const sev 1)
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(2);
    expect(result.total).toBe(4);
  });

  it("filesChecked matches the number of entries in the JSON array", () => {
    const resultSingle = parseEslintJson(eslintSingleFile);
    expect(resultSingle.filesChecked).toBe(1);

    const resultMulti = parseEslintJson(eslintMultiFile);
    expect(resultMulti.filesChecked).toBe(3);

    const resultClean = parseEslintJson(eslintClean);
    expect(resultClean.filesChecked).toBe(2);
  });

  it("handles severity 0 as 'info'", () => {
    const json = JSON.stringify([
      {
        filePath: "/project/src/index.ts",
        messages: [
          {
            ruleId: "some-info-rule",
            severity: 0,
            message: "Informational notice",
            line: 1,
            column: 1,
          },
        ],
        errorCount: 0,
        warningCount: 0,
      },
    ]);

    const result = parseEslintJson(json);
    expect(result.diagnostics[0].severity).toBe("info");
  });
});

// ---------------------------------------------------------------------------
// Prettier fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parsePrettierCheck", () => {
  it("captures all unformatted file paths", () => {
    const result = parsePrettierCheck(prettierUnformatted, "", 1);

    expect(result.files).toContain("src/index.ts");
    expect(result.files).toContain("src/utils.ts");
  });

  it("file count matches the number of [warn] file lines", () => {
    const result = parsePrettierCheck(prettierUnformatted, "", 1);
    expect(result.total).toBe(2);
    expect(result.files).toHaveLength(2);
  });

  it("returns formatted=true and empty files when exit code is 0", () => {
    const result = parsePrettierCheck(prettierClean, "", 0);

    expect(result.formatted).toBe(true);
    expect(result.files).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("extracts only file paths, not the summary [warn] line", () => {
    const result = parsePrettierCheck(prettierUnformatted, "", 1);

    // The summary line "[warn] Code style issues found in 2 files. Forgot to run Prettier?"
    // should NOT be included as a file path
    for (const f of result.files) {
      expect(f).not.toContain("Code style issues");
    }

    // Only actual file paths should be present
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("handles output with many [warn] file lines", () => {
    const manyFiles = [
      "Checking formatting...",
      "[warn] src/a.ts",
      "[warn] src/b.tsx",
      "[warn] src/c.js",
      "[warn] lib/d.mjs",
      "[warn] Code style issues found in 4 files. Forgot to run Prettier?",
    ].join("\n");

    const result = parsePrettierCheck(manyFiles, "", 1);

    expect(result.total).toBe(4);
    expect(result.files).toEqual(["src/a.ts", "src/b.tsx", "src/c.js", "lib/d.mjs"]);
    expect(result.formatted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Biome check fixtures
// ---------------------------------------------------------------------------

/** Realistic Biome check output with mixed lint and format diagnostics. */
const biomeCheckMixed = JSON.stringify({
  diagnostics: [
    {
      category: "lint/suspicious/noDoubleEquals",
      severity: "error",
      description: "Use === instead of ==.\n\n  == is only allowed when comparing against null",
      location: {
        path: { file: "src/components/App.tsx" },
        span: { start: 450, end: 452 },
        sourceCode: { lineNumber: 18, columnNumber: 12 },
      },
      tags: ["fixable"],
    },
    {
      category: "lint/style/useConst",
      severity: "warning",
      description: "This let declaration can be made const.",
      location: {
        path: { file: "src/components/App.tsx" },
        span: { start: 200, end: 203 },
        sourceCode: { lineNumber: 8, columnNumber: 5 },
      },
      tags: ["fixable"],
    },
    {
      category: "lint/correctness/noUnusedImports",
      severity: "warning",
      description: "This import is unused.",
      location: {
        path: { file: "src/utils/helpers.ts" },
        span: { start: 0, end: 30 },
        sourceCode: { lineNumber: 1, columnNumber: 1 },
      },
      tags: ["fixable"],
    },
    {
      category: "format",
      severity: "error",
      description: "File not formatted. Run `biome format --write` to fix.",
      location: {
        path: { file: "src/utils/helpers.ts" },
        span: { start: 0, end: 500 },
        sourceCode: { lineNumber: 1, columnNumber: 1 },
      },
      tags: ["fixable"],
    },
    {
      category: "lint/suspicious/noExplicitAny",
      severity: "error",
      description: "Unexpected any. Specify a different type.",
      location: {
        path: { file: "src/lib/api.ts" },
        span: { start: 1200, end: 1203 },
        sourceCode: { lineNumber: 42, columnNumber: 30 },
      },
      tags: [],
    },
    {
      category: "lint/nursery/noConsole",
      severity: "information",
      description: "Don't use console.log.",
      location: {
        path: { file: "src/lib/api.ts" },
        span: { start: 800, end: 811 },
        sourceCode: { lineNumber: 25, columnNumber: 3 },
      },
      tags: [],
    },
  ],
});

/** Biome check with only format diagnostics (no lint issues). */
const biomeCheckFormatOnly = JSON.stringify({
  diagnostics: [
    {
      category: "format",
      severity: "error",
      description: "File not formatted.",
      location: {
        path: { file: "src/index.ts" },
        sourceCode: { lineNumber: 1, columnNumber: 1 },
      },
      tags: ["fixable"],
    },
    {
      category: "format",
      severity: "error",
      description: "File not formatted.",
      location: {
        path: { file: "src/config.ts" },
        sourceCode: { lineNumber: 1, columnNumber: 1 },
      },
      tags: ["fixable"],
    },
  ],
});

/** Biome check with fatal severity. */
const biomeCheckFatal = JSON.stringify({
  diagnostics: [
    {
      category: "parse",
      severity: "fatal",
      description:
        "Expected a semicolon or an implicit semicolon after a statement, but found none.",
      location: {
        path: { file: "src/broken.ts" },
        span: { start: 50, end: 51 },
        sourceCode: { lineNumber: 3, columnNumber: 10 },
      },
      tags: [],
    },
  ],
});

// ---------------------------------------------------------------------------
// Biome check fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseBiomeJson", () => {
  it("preserves file, line, severity, rule, and message for each diagnostic", () => {
    const result = parseBiomeJson(biomeCheckMixed);

    const first = result.diagnostics[0];
    expect(first.file).toBe("src/components/App.tsx");
    expect(first.line).toBe(18);
    expect(first.severity).toBe("error");
    expect(first.rule).toBe("lint/suspicious/noDoubleEquals");
    expect(first.message).toContain("Use === instead of ==");
  });

  it("captures all diagnostics from mixed lint + format output", () => {
    const result = parseBiomeJson(biomeCheckMixed);

    expect(result.diagnostics).toHaveLength(6);
    expect(result.total).toBe(6);
  });

  it("correctly counts errors and warnings across mixed output", () => {
    const result = parseBiomeJson(biomeCheckMixed);

    // errors: noDoubleEquals (error), format (error), noExplicitAny (error) = 3
    // warnings: useConst (warning), noUnusedImports (warning) = 2
    // info: noConsole (information) = 1
    expect(result.errors).toBe(3);
    expect(result.warnings).toBe(2);
  });

  it("counts unique files correctly when same file has multiple diagnostics", () => {
    const result = parseBiomeJson(biomeCheckMixed);

    // src/components/App.tsx (2 diags), src/utils/helpers.ts (2 diags), src/lib/api.ts (2 diags)
    expect(result.filesChecked).toBe(3);
  });

  it("maps Biome severity 'error' to 'error'", () => {
    const result = parseBiomeJson(biomeCheckMixed);
    const errorDiags = result.diagnostics.filter((d) => d.severity === "error");

    expect(errorDiags.length).toBe(3);
    expect(errorDiags.map((d) => d.rule)).toContain("lint/suspicious/noDoubleEquals");
    expect(errorDiags.map((d) => d.rule)).toContain("format");
    expect(errorDiags.map((d) => d.rule)).toContain("lint/suspicious/noExplicitAny");
  });

  it("maps Biome severity 'warning' to 'warning'", () => {
    const result = parseBiomeJson(biomeCheckMixed);
    const warningDiags = result.diagnostics.filter((d) => d.severity === "warning");

    expect(warningDiags.length).toBe(2);
    expect(warningDiags.map((d) => d.rule)).toContain("lint/style/useConst");
    expect(warningDiags.map((d) => d.rule)).toContain("lint/correctness/noUnusedImports");
  });

  it("maps Biome severity 'information' to 'info'", () => {
    const result = parseBiomeJson(biomeCheckMixed);
    const infoDiags = result.diagnostics.filter((d) => d.severity === "info");

    expect(infoDiags.length).toBe(1);
    expect(infoDiags[0].rule).toBe("lint/nursery/noConsole");
  });

  it("maps Biome severity 'fatal' to 'error'", () => {
    const result = parseBiomeJson(biomeCheckFatal);

    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.errors).toBe(1);
  });

  it("correctly handles format-only diagnostics", () => {
    const result = parseBiomeJson(biomeCheckFormatOnly);

    expect(result.total).toBe(2);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics.every((d) => d.rule === "format")).toBe(true);
  });

  it("preserves multi-line description messages", () => {
    const result = parseBiomeJson(biomeCheckMixed);
    const first = result.diagnostics[0];
    // The description contains a newline
    expect(first.message).toContain("== is only allowed when comparing against null");
  });
});

// ---------------------------------------------------------------------------
// Biome format fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseBiomeFormat", () => {
  it("captures all formatted file paths from realistic output", () => {
    const stdout = [
      "src/components/App.tsx",
      "src/utils/helpers.ts",
      "src/lib/api.ts",
      "src/index.ts",
      "Formatted 4 files in 120ms. Fixed 4 files.",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(4);
    expect(result.files).toEqual([
      "src/components/App.tsx",
      "src/utils/helpers.ts",
      "src/lib/api.ts",
      "src/index.ts",
    ]);
  });

  it("filters out all summary line variants", () => {
    const stdout = [
      "src/a.ts",
      "src/b.ts",
      "Formatted 2 files in 50ms.",
      "Fixed 2 files.",
      "Checked 10 files in 30ms. No fixes needed.",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.files).toEqual(["src/a.ts", "src/b.ts"]);
    expect(result.filesChanged).toBe(2);
  });

  it("returns empty files when Biome reports nothing to format", () => {
    const stdout = "Checked 5 files in 20ms. No fixes needed.";

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles stderr content without affecting file list", () => {
    const stdout = "src/index.ts\nsrc/utils.ts";
    const stderr = "Some warning about configuration";

    const result = parseBiomeFormat(stdout, stderr, 0);

    // stderr content without file extension won't be included
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });
});

// ---------------------------------------------------------------------------
// Prettier --write fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parsePrettierWrite", () => {
  it("captures all formatted file paths from realistic output", () => {
    const stdout = [
      "src/components/App.tsx",
      "src/utils/helpers.ts",
      "src/lib/api.ts",
      "src/styles/main.css",
      "package.json",
    ].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(5);
    expect(result.files).toEqual([
      "src/components/App.tsx",
      "src/utils/helpers.ts",
      "src/lib/api.ts",
      "src/styles/main.css",
      "package.json",
    ]);
  });

  it("filters out [warn] lines and informational messages", () => {
    const stdout = [
      "src/index.ts",
      "[warn] src/index.ts was not formatted",
      "src/utils.ts",
      "Checking formatting...",
      "All matched files use Prettier code style!",
    ].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.filesChanged).toBe(2);
  });

  it("returns success=false with non-zero exit code", () => {
    const result = parsePrettierWrite("", "error: unexpected token", 2);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
  });

  it("handles various file extensions correctly", () => {
    const stdout = [
      "src/app.tsx",
      "styles/main.css",
      "config/settings.json",
      "docs/guide.md",
      "scripts/build.mjs",
    ].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.filesChanged).toBe(5);
    expect(result.files).toEqual([
      "src/app.tsx",
      "styles/main.css",
      "config/settings.json",
      "docs/guide.md",
      "scripts/build.mjs",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Stylelint fixtures
// ---------------------------------------------------------------------------

/** Multiple files with mixed errors and warnings. */
const stylelintMixed = JSON.stringify([
  {
    source: "/project/src/styles.css",
    warnings: [
      {
        line: 5,
        column: 3,
        rule: "color-no-invalid-hex",
        severity: "error",
        text: 'Unexpected invalid hex color "#xyz" (color-no-invalid-hex)',
      },
      {
        line: 12,
        column: 1,
        rule: "declaration-block-no-duplicate-properties",
        severity: "warning",
        text: "Unexpected duplicate property (declaration-block-no-duplicate-properties)",
      },
    ],
    deprecations: [],
    invalidOptionWarnings: [],
  },
  {
    source: "/project/src/components/button.css",
    warnings: [
      {
        line: 1,
        column: 1,
        rule: "block-no-empty",
        severity: "warning",
        text: "Unexpected empty block (block-no-empty)",
      },
    ],
    deprecations: [],
    invalidOptionWarnings: [],
  },
]);

/** Clean Stylelint output. */
const stylelintClean = JSON.stringify([
  { source: "/project/src/styles.css", warnings: [], deprecations: [], invalidOptionWarnings: [] },
  {
    source: "/project/src/components/button.css",
    warnings: [],
    deprecations: [],
    invalidOptionWarnings: [],
  },
]);

// ---------------------------------------------------------------------------
// Stylelint fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseStylelintJson", () => {
  it("preserves file, line, severity, rule, and message for each warning", () => {
    const result = parseStylelintJson(stylelintMixed);
    const first = result.diagnostics[0];

    expect(first.file).toBe("/project/src/styles.css");
    expect(first.line).toBe(5);
    expect(first.severity).toBe("error");
    expect(first.rule).toBe("color-no-invalid-hex");
    expect(first.message).toContain("Unexpected invalid hex color");
  });

  it("captures all warnings across multiple files", () => {
    const result = parseStylelintJson(stylelintMixed);

    expect(result.diagnostics).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("correctly counts errors and warnings", () => {
    const result = parseStylelintJson(stylelintMixed);

    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
  });

  it("counts unique files correctly", () => {
    const result = parseStylelintJson(stylelintMixed);

    expect(result.filesChecked).toBe(2);
  });

  it("returns empty diagnostics and zero counts for clean output", () => {
    const result = parseStylelintJson(stylelintClean);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Oxlint fixtures
// ---------------------------------------------------------------------------

/** Multiple diagnostics across files in NDJSON format. */
const oxlintMixed = [
  JSON.stringify({
    file: "/project/src/index.ts",
    line: 10,
    column: 5,
    endLine: 10,
    endColumn: 6,
    severity: "error",
    ruleId: "no-unused-vars",
    message: "'x' is defined but never used",
  }),
  JSON.stringify({
    file: "/project/src/index.ts",
    line: 15,
    column: 1,
    severity: "warning",
    ruleId: "no-console",
    message: "Unexpected console statement",
    fix: { range: [100, 111], text: "" },
  }),
  JSON.stringify({
    file: "/project/src/utils.ts",
    line: 7,
    column: 10,
    endLine: 7,
    endColumn: 12,
    severity: "error",
    ruleId: "eqeqeq",
    message: "Expected '===' and instead saw '=='",
    fix: { range: [50, 52], text: "===" },
  }),
].join("\n");

/** Clean Oxlint output (empty). */
const oxlintClean = "";

// ---------------------------------------------------------------------------
// Oxlint fidelity tests
// ---------------------------------------------------------------------------

describe("fidelity: parseOxlintJson", () => {
  it("preserves file, line, severity, rule, and message for each diagnostic", () => {
    const result = parseOxlintJson(oxlintMixed);
    const first = result.diagnostics[0];

    expect(first.file).toBe("/project/src/index.ts");
    expect(first.line).toBe(10);
    expect(first.severity).toBe("error");
    expect(first.rule).toBe("no-unused-vars");
    expect(first.message).toBe("'x' is defined but never used");
  });

  it("captures all diagnostics across multiple files", () => {
    const result = parseOxlintJson(oxlintMixed);
    const files = new Set(result.diagnostics.map((d) => d.file));

    expect(result.diagnostics).toHaveLength(3);
    expect(files.size).toBe(2);
    expect(files).toContain("/project/src/index.ts");
    expect(files).toContain("/project/src/utils.ts");
  });

  it("correctly counts errors and warnings", () => {
    const result = parseOxlintJson(oxlintMixed);

    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(1);
  });

  it("returns empty diagnostics and zero counts for clean output", () => {
    const result = parseOxlintJson(oxlintClean);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(0);
  });

  it("counts unique files correctly when same file has multiple diagnostics", () => {
    const result = parseOxlintJson(oxlintMixed);

    expect(result.filesChecked).toBe(2);
  });
});
