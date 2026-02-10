import { describe, it, expect } from "vitest";
import { formatLint, formatFormatCheck, formatFormatWrite } from "../src/lib/formatters.js";
import type { LintResult, FormatCheckResult, FormatWriteResult } from "../src/schemas/index.js";

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

  it("formats with 0 files needing formatting (false positive exit code)", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: [],
      total: 0,
    };
    const output = formatFormatCheck(data);
    expect(output).toContain("0 files need formatting:");
  });

  it("formats with 100 files needing formatting", () => {
    const files = Array.from({ length: 100 }, (_, i) => `src/file${i}.ts`);
    const data: FormatCheckResult = {
      formatted: false,
      files,
      total: 100,
    };
    const output = formatFormatCheck(data);
    expect(output).toContain("100 files need formatting:");
    expect(output).toContain("src/file0.ts");
    expect(output).toContain("src/file99.ts");
    // Verify all 100 files are listed (header line + 100 file lines)
    const lines = output.split("\n");
    expect(lines).toHaveLength(101);
  });
});

// ---------------------------------------------------------------------------
// formatLint edge cases
// ---------------------------------------------------------------------------

describe("formatLint edge cases", () => {
  it("formats lint result with 10+ diagnostics across multiple files", () => {
    const diagnostics = Array.from({ length: 12 }, (_, i) => ({
      file: `src/module${i % 4}.ts`,
      line: 10 + i,
      column: 1 + (i % 10),
      severity: (i % 3 === 0 ? "error" : "warning") as "error" | "warning",
      rule: i % 2 === 0 ? "no-unused-vars" : "prefer-const",
      message: `Diagnostic message number ${i + 1}.`,
      fixable: i % 2 === 0,
    }));

    const errors = diagnostics.filter((d) => d.severity === "error").length;
    const warnings = diagnostics.filter((d) => d.severity === "warning").length;
    const fixable = diagnostics.filter((d) => d.fixable).length;

    const data: LintResult = {
      diagnostics,
      total: 12,
      errors,
      warnings,
      fixable,
      filesChecked: 4,
    };

    const output = formatLint(data);

    // Header line with counts
    expect(output).toContain(`${errors} errors, ${warnings} warnings (${fixable} fixable)`);

    // All 12 diagnostics should appear
    const lines = output.split("\n");
    // 1 header + 12 diagnostic lines
    expect(lines).toHaveLength(13);

    // Spot-check first and last
    expect(lines[1]).toContain("src/module0.ts:10:1");
    expect(lines[12]).toContain("src/module3.ts:21:");
  });

  it("formats lint result with special characters in file paths", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "src/components/[id]/page.tsx",
          line: 5,
          column: 10,
          severity: "error",
          rule: "no-unused-vars",
          message: "Unused var in dynamic route.",
          fixable: false,
        },
        {
          file: "src/utils/my file (copy).ts",
          line: 3,
          column: 1,
          severity: "warning",
          rule: "prefer-const",
          message: "Use const.",
          fixable: true,
        },
        {
          file: "src/lib/@internal/helpers.ts",
          line: 1,
          column: 1,
          severity: "error",
          rule: "no-console",
          message: "No console.",
          fixable: false,
        },
      ],
      total: 3,
      errors: 2,
      warnings: 1,
      fixable: 1,
      filesChecked: 3,
    };

    const output = formatLint(data);

    expect(output).toContain("src/components/[id]/page.tsx:5:10");
    expect(output).toContain("src/utils/my file (copy).ts:3:1");
    expect(output).toContain("src/lib/@internal/helpers.ts:1:1");
  });
});

// ---------------------------------------------------------------------------
// formatFormatWrite edge cases
// ---------------------------------------------------------------------------

describe("formatFormatWrite edge cases", () => {
  it("formats result with 0 files changed (success)", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: true,
    };

    expect(formatFormatWrite(data)).toBe("All files already formatted.");
  });

  it("formats failure with 0 files", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
    };

    expect(formatFormatWrite(data)).toBe("Format failed.");
  });
});
