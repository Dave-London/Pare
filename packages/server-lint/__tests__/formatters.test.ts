import { describe, it, expect } from "vitest";
import { formatLint, formatFormatCheck } from "../src/lib/formatters.js";
import type { LintResult, FormatCheckResult } from "../src/schemas/index.js";

describe("formatLint", () => {
  it("formats clean lint result", () => {
    const data: LintResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
      fixable: 0,
      filesChecked: 25,
    };
    expect(formatLint(data)).toBe("Lint: no issues found (25 files checked).");
  });

  it("formats lint result with errors and warnings", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "src/index.ts",
          line: 5,
          column: 10,
          severity: "error",
          rule: "no-unused-vars",
          message: "'foo' is defined but never used.",
          fixable: false,
        },
        {
          file: "src/utils.ts",
          line: 12,
          column: 1,
          severity: "warning",
          rule: "prefer-const",
          message: "'x' is never reassigned. Use 'const' instead.",
          fixable: true,
        },
      ],
      total: 2,
      errors: 1,
      warnings: 1,
      fixable: 1,
      filesChecked: 10,
    };
    const output = formatLint(data);
    expect(output).toContain("Lint: 1 errors, 1 warnings (1 fixable)");
    expect(output).toContain(
      "src/index.ts:5:10 error no-unused-vars: 'foo' is defined but never used.",
    );
    expect(output).toContain(
      "src/utils.ts:12:1 warning prefer-const: 'x' is never reassigned. Use 'const' instead.",
    );
  });

  it("formats lint result with only warnings", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "src/app.ts",
          line: 1,
          column: 1,
          severity: "warning",
          rule: "import/order",
          message: "Import order is incorrect.",
          fixable: true,
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
      fixable: 1,
      filesChecked: 5,
    };
    const output = formatLint(data);
    expect(output).toContain("Lint: 0 errors, 1 warnings (1 fixable)");
    expect(output).toContain("src/app.ts:1:1 warning import/order: Import order is incorrect.");
  });
});

describe("formatFormatCheck", () => {
  it("formats when all files are formatted", () => {
    const data: FormatCheckResult = {
      formatted: true,
      files: [],
      total: 0,
    };
    expect(formatFormatCheck(data)).toBe("All files are formatted.");
  });

  it("formats when files need formatting", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: ["src/index.ts", "src/utils.ts", "src/config.ts"],
      total: 3,
    };
    const output = formatFormatCheck(data);
    expect(output).toContain("3 files need formatting:");
    expect(output).toContain("src/index.ts");
    expect(output).toContain("src/utils.ts");
    expect(output).toContain("src/config.ts");
  });
});
