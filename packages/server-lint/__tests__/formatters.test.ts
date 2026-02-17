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
          severity: "error",
          rule: "no-unused-vars",
          message: "'foo' is defined but never used.",
        },
        {
          file: "src/utils.ts",
          line: 12,
          severity: "warning",
          rule: "prefer-const",
          message: "'x' is never reassigned. Use 'const' instead.",
        },
      ],
      total: 2,
      errors: 1,
      warnings: 1,
      filesChecked: 10,
    };
    const output = formatLint(data);
    expect(output).toContain("Lint: 1 errors, 1 warnings");
    expect(output).toContain(
      "src/index.ts:5 error no-unused-vars: 'foo' is defined but never used.",
    );
    expect(output).toContain(
      "src/utils.ts:12 warning prefer-const: 'x' is never reassigned. Use 'const' instead.",
    );
  });

  it("formats lint result with only warnings", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "src/app.ts",
          line: 1,
          severity: "warning",
          rule: "import/order",
          message: "Import order is incorrect.",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
      filesChecked: 5,
    };
    const output = formatLint(data);
    expect(output).toContain("Lint: 0 errors, 1 warnings");
    expect(output).toContain("src/app.ts:1 warning import/order: Import order is incorrect.");
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
// formatLint with shellcheck-shaped data (SC codes, shell script files)
// ---------------------------------------------------------------------------

describe("formatLint with shellcheck-shaped data", () => {
  it("formats shellcheck diagnostics with SC rule codes", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "deploy.sh",
          line: 5,
          severity: "error",
          rule: "SC2086",
          message: "Double quote to prevent globbing and word splitting.",
        },
        {
          file: "deploy.sh",
          line: 10,
          severity: "warning",
          rule: "SC2034",
          message: "foo appears unused. Verify use (or export).",
        },
        {
          file: "build.sh",
          line: 3,
          severity: "info",
          rule: "SC2148",
          message: "Tips depend on target shell and target OS.",
        },
      ],
      total: 3,
      errors: 1,
      warnings: 1,
      filesChecked: 2,
    };

    const output = formatLint(data);
    expect(output).toContain("Lint: 1 errors, 1 warnings");
    expect(output).toContain(
      "deploy.sh:5 error SC2086: Double quote to prevent globbing and word splitting.",
    );
    expect(output).toContain(
      "deploy.sh:10 warning SC2034: foo appears unused. Verify use (or export).",
    );
    expect(output).toContain("build.sh:3 info SC2148: Tips depend on target shell and target OS.");
  });

  it("formats clean shellcheck result", () => {
    const data: LintResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
      filesChecked: 3,
    };
    expect(formatLint(data)).toBe("Lint: no issues found (3 files checked).");
  });
});

// ---------------------------------------------------------------------------
// formatLint with hadolint-shaped data (DL/SC codes, Dockerfile paths)
// ---------------------------------------------------------------------------

describe("formatLint with hadolint-shaped data", () => {
  it("formats hadolint diagnostics with DL rule codes", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "Dockerfile",
          line: 3,
          severity: "error",
          rule: "DL3006",
          message: "Always tag the version of an image explicitly.",
        },
        {
          file: "Dockerfile",
          line: 7,
          severity: "warning",
          rule: "DL3008",
          message: "Pin versions in apt get install.",
        },
        {
          file: "Dockerfile.dev",
          line: 1,
          severity: "info",
          rule: "DL3048",
          message: "Invalid label key.",
        },
      ],
      total: 3,
      errors: 1,
      warnings: 1,
      filesChecked: 2,
    };

    const output = formatLint(data);
    expect(output).toContain("Lint: 1 errors, 1 warnings");
    expect(output).toContain(
      "Dockerfile:3 error DL3006: Always tag the version of an image explicitly.",
    );
    expect(output).toContain("Dockerfile:7 warning DL3008: Pin versions in apt get install.");
    expect(output).toContain("Dockerfile.dev:1 info DL3048: Invalid label key.");
  });

  it("formats hadolint diagnostics with SC-prefixed codes (ShellCheck rules in Dockerfile RUN)", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "Dockerfile",
          line: 5,
          severity: "warning",
          rule: "SC2046",
          message: "Quote this to prevent word splitting.",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
      filesChecked: 1,
    };

    const output = formatLint(data);
    expect(output).toContain("Lint: 0 errors, 1 warnings");
    expect(output).toContain("Dockerfile:5 warning SC2046: Quote this to prevent word splitting.");
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
      severity: (i % 3 === 0 ? "error" : "warning") as "error" | "warning",
      rule: i % 2 === 0 ? "no-unused-vars" : "prefer-const",
      message: `Diagnostic message number ${i + 1}.`,
    }));

    const errors = diagnostics.filter((d) => d.severity === "error").length;
    const warnings = diagnostics.filter((d) => d.severity === "warning").length;

    const data: LintResult = {
      diagnostics,
      total: 12,
      errors,
      warnings,
      filesChecked: 4,
    };

    const output = formatLint(data);

    // Header line with counts
    expect(output).toContain(`${errors} errors, ${warnings} warnings`);

    // All 12 diagnostics should appear
    const lines = output.split("\n");
    // 1 header + 12 diagnostic lines
    expect(lines).toHaveLength(13);

    // Spot-check first and last
    expect(lines[1]).toContain("src/module0.ts:10");
    expect(lines[12]).toContain("src/module3.ts:21");
  });

  it("formats lint result with special characters in file paths", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "src/components/[id]/page.tsx",
          line: 5,
          severity: "error",
          rule: "no-unused-vars",
          message: "Unused var in dynamic route.",
        },
        {
          file: "src/utils/my file (copy).ts",
          line: 3,
          severity: "warning",
          rule: "prefer-const",
          message: "Use const.",
        },
        {
          file: "src/lib/@internal/helpers.ts",
          line: 1,
          severity: "error",
          rule: "no-console",
          message: "No console.",
        },
      ],
      total: 3,
      errors: 2,
      warnings: 1,
      filesChecked: 3,
    };

    const output = formatLint(data);

    expect(output).toContain("src/components/[id]/page.tsx:5");
    expect(output).toContain("src/utils/my file (copy).ts:3");
    expect(output).toContain("src/lib/@internal/helpers.ts:1");
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

  it("formats failure with explicit error message", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
      errorMessage: "No parser could be inferred for file",
    };

    expect(formatFormatWrite(data)).toBe("Format failed: No parser could be inferred for file");
  });
});

describe("formatLint metadata sections", () => {
  it("includes tags, suggested fixes, and deprecations", () => {
    const data: LintResult = {
      diagnostics: [
        {
          file: "deploy.sh",
          line: 5,
          severity: "warning",
          rule: "SC2086",
          message: "Double quote to prevent globbing and word splitting.",
          tags: ["fixable"],
          suggestedFixes: ['"$var"'],
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
      filesChecked: 1,
      deprecations: [{ text: "Deprecated rule used", reference: "https://example.com" }],
    };

    const output = formatLint(data);
    expect(output).toContain("tags: fixable");
    expect(output).toContain('suggestedFixes: "$var"');
    expect(output).toContain("Deprecations:");
    expect(output).toContain("Deprecated rule used (https://example.com)");
  });
});
