/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from the raw ESLint and Prettier CLI output.
 *
 * These tests use realistic fixture data that mirrors actual CLI output,
 * then verify that parsed structured output retains every important field.
 */
import { describe, it, expect } from "vitest";
import { parseEslintJson, parsePrettierCheck } from "../src/lib/parsers.js";

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
  it("preserves file, line, column, severity, rule, and message for a single violation", () => {
    const result = parseEslintJson(eslintSingleFile);
    const diag = result.diagnostics[0];

    expect(diag.file).toBe("/project/src/index.ts");
    expect(diag.line).toBe(10);
    expect(diag.column).toBe(5);
    expect(diag.endLine).toBe(10);
    expect(diag.endColumn).toBe(6);
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

  it("preserves the fixable flag for violations with a fix object", () => {
    const result = parseEslintJson(eslintSingleFile);

    // First diagnostic has fix: null => fixable false
    expect(result.diagnostics[0].fixable).toBe(false);
    // Second diagnostic has fix object => fixable true
    expect(result.diagnostics[1].fixable).toBe(true);
  });

  it("returns empty diagnostics and zero counts for clean output", () => {
    const result = parseEslintJson(eslintClean);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.fixable).toBe(0);
  });

  it("error and warning counts match the raw data", () => {
    const result = parseEslintJson(eslintMultiFile);

    // Raw data: 2 errors (no-unused-vars sev 2, eqeqeq sev 2), 2 warnings (no-console sev 1, prefer-const sev 1)
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(2);
    expect(result.total).toBe(4);
    // fixable: eqeqeq + prefer-const
    expect(result.fixable).toBe(2);
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
