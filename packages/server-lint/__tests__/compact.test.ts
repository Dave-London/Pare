import { describe, it, expect } from "vitest";
import {
  compactLintMap,
  formatLintCompact,
  compactFormatCheckMap,
  formatFormatCheckCompact,
  compactFormatWriteMap,
  formatFormatWriteCompact,
  COMPACT_DIAGNOSTIC_LIMIT,
  COMPACT_FILE_LIMIT,
} from "../src/lib/formatters.js";
import {
  LintResultSchema,
  FormatCheckResultSchema,
  type LintResult,
  type LintDiagnostic,
  type FormatCheckResult,
  type FormatWriteResult,
} from "../src/schemas/index.js";

function makeDiagnostics(count: number): LintDiagnostic[] {
  return Array.from({ length: count }, (_, i) => ({
    file: `src/file${i}.ts`,
    line: i + 1,
    severity: (i % 2 === 0 ? "error" : "warning") as "error" | "warning",
    rule: "no-unused-vars",
    message: `'foo${i}' is defined but never used.`,
  }));
}

// ---------------------------------------------------------------------------
// compactLintMap
// ---------------------------------------------------------------------------

describe("compactLintMap", () => {
  it("keeps counts AND diagnostics (#1022)", () => {
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

      errors: 1,
      warnings: 1,
      filesChecked: 10,
    };

    const compact = compactLintMap(data);

    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(1);
    expect(compact.filesChecked).toBe(10);
    // Diagnostics are kept in compact mode (the actionable payload)
    expect(compact.diagnostics).toHaveLength(2);
    expect(compact.diagnostics?.[0]).toMatchObject({
      file: "src/index.ts",
      line: 5,
      rule: "no-unused-vars",
      message: "'foo' is defined but never used.",
    });
    // No truncation flags when under the cap
    expect(compact).not.toHaveProperty("diagnosticsTruncated");
    expect(compact).not.toHaveProperty("omittedCount");
  });

  it("caps diagnostics at COMPACT_DIAGNOSTIC_LIMIT with truncation metadata", () => {
    const data: LintResult = {
      diagnostics: makeDiagnostics(COMPACT_DIAGNOSTIC_LIMIT + 15),
      errors: 20,
      warnings: 20,
      filesChecked: 40,
    };

    const compact = compactLintMap(data);

    expect(compact.diagnostics).toHaveLength(COMPACT_DIAGNOSTIC_LIMIT);
    expect(compact.diagnosticsTruncated).toBe(true);
    expect(compact.omittedCount).toBe(15);
    // First-N kept in order
    expect(compact.diagnostics?.[0].file).toBe("src/file0.ts");
  });

  it("keeps fixable counts (#1022)", () => {
    const data: LintResult = {
      diagnostics: makeDiagnostics(2),
      errors: 1,
      warnings: 1,
      fixableErrorCount: 1,
      fixableWarningCount: 1,
      filesChecked: 5,
    };

    const compact = compactLintMap(data);
    expect(compact.fixableErrorCount).toBe(1);
    expect(compact.fixableWarningCount).toBe(1);
  });

  it("handles clean lint result", () => {
    const data: LintResult = {
      diagnostics: [],

      errors: 0,
      warnings: 0,
      filesChecked: 25,
    };

    const compact = compactLintMap(data);

    expect(compact.errors).toBe(0);
    expect(compact.filesChecked).toBe(25);
    expect(compact).not.toHaveProperty("diagnostics");
  });

  it("includes deprecationCount when present", () => {
    const data: LintResult = {
      diagnostics: [],

      errors: 0,
      warnings: 0,
      filesChecked: 1,
      deprecations: [{ text: "Deprecated option" }],
    };

    const compact = compactLintMap(data);
    expect(compact.deprecationCount).toBe(1);
  });

  it("passes through error and exitCode (#1024)", () => {
    const data: LintResult = {
      diagnostics: [],
      errors: 0,
      warnings: 0,
      filesChecked: 0,
      error: "Oops! Something went wrong! Cannot find module 'eslint-plugin-foo'",
      exitCode: 2,
    };

    const compact = compactLintMap(data);
    expect(compact.error).toBe(data.error);
    expect(compact.exitCode).toBe(2);
  });

  it("produces output that validates against LintResultSchema", () => {
    const data: LintResult = {
      diagnostics: makeDiagnostics(COMPACT_DIAGNOSTIC_LIMIT + 5),
      errors: 15,
      warnings: 15,
      fixableErrorCount: 3,
      fixableWarningCount: 2,
      filesChecked: 30,
    };

    const compact = compactLintMap(data);
    expect(LintResultSchema.safeParse(compact).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatLintCompact
// ---------------------------------------------------------------------------

describe("formatLintCompact", () => {
  it("formats clean lint result", () => {
    const compact = { errors: 0, warnings: 0, filesChecked: 25 };
    expect(formatLintCompact(compact)).toBe("Lint: no issues found (25 files checked).");
  });

  it("formats lint result with counts", () => {
    const compact = { errors: 2, warnings: 3, filesChecked: 10 };
    expect(formatLintCompact(compact)).toBe("Lint: 2 errors, 3 warnings across 10 files.");
  });

  it("formats lint result with deprecation count", () => {
    const compact = { errors: 0, warnings: 1, filesChecked: 2, deprecationCount: 3 };
    expect(formatLintCompact(compact)).toBe(
      "Lint: 0 errors, 1 warnings across 2 files (3 deprecations).",
    );
  });

  it("lists diagnostics and the omitted count", () => {
    const compact = compactLintMap({
      diagnostics: makeDiagnostics(COMPACT_DIAGNOSTIC_LIMIT + 3),
      errors: 14,
      warnings: 14,
      filesChecked: 28,
    });

    const text = formatLintCompact(compact);
    expect(text).toContain("src/file0.ts:1 error no-unused-vars");
    expect(text).toContain("... (3 more diagnostics omitted)");
  });

  it("formats surfaced failures", () => {
    const compact = {
      errors: 0,
      warnings: 0,
      filesChecked: 0,
      error: "Cannot find module 'eslint-plugin-foo'",
      exitCode: 2,
    };
    expect(formatLintCompact(compact)).toBe(
      "Lint failed (exit 2): Cannot find module 'eslint-plugin-foo'",
    );
  });
});

// ---------------------------------------------------------------------------
// compactLintMap with shellcheck-shaped data
// ---------------------------------------------------------------------------

describe("compactLintMap with shellcheck-shaped data", () => {
  it("keeps counts and SC-code diagnostics", () => {
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
          file: "build.sh",
          line: 3,
          severity: "info",
          rule: "SC2148",
          message: "Tips depend on target shell and target OS.",
        },
      ],

      errors: 1,
      warnings: 0,
      filesChecked: 2,
    };

    const compact = compactLintMap(data);

    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(0);
    expect(compact.filesChecked).toBe(2);
    expect(compact.diagnostics).toHaveLength(2);
    expect(compact.diagnostics?.[0].rule).toBe("SC2086");
  });
});

// ---------------------------------------------------------------------------
// compactLintMap with hadolint-shaped data
// ---------------------------------------------------------------------------

describe("compactLintMap with hadolint-shaped data", () => {
  it("keeps counts and DL-code diagnostics", () => {
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
      ],

      errors: 1,
      warnings: 1,
      filesChecked: 1,
    };

    const compact = compactLintMap(data);

    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(1);
    expect(compact.filesChecked).toBe(1);
    expect(compact.diagnostics).toHaveLength(2);
    expect(compact.diagnostics?.[1].rule).toBe("DL3008");
  });
});

// ---------------------------------------------------------------------------
// compactFormatCheckMap
// ---------------------------------------------------------------------------

describe("compactFormatCheckMap", () => {
  it("keeps the file list and total (#1021)", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: ["src/index.ts", "src/utils.ts", "src/config.ts"],
    };

    const compact = compactFormatCheckMap(data);

    expect(compact.formatted).toBe(false);
    expect(compact.files).toEqual(["src/index.ts", "src/utils.ts", "src/config.ts"]);
    expect(compact.total).toBe(3);
    expect(compact).not.toHaveProperty("filesTruncated");
  });

  it("caps the file list at COMPACT_FILE_LIMIT with truncation metadata", () => {
    const files = Array.from({ length: COMPACT_FILE_LIMIT + 20 }, (_, i) => `src/file${i}.ts`);
    const data: FormatCheckResult = { formatted: false, files };

    const compact = compactFormatCheckMap(data);

    expect(compact.files).toHaveLength(COMPACT_FILE_LIMIT);
    expect(compact.total).toBe(COMPACT_FILE_LIMIT + 20);
    expect(compact.filesTruncated).toBe(true);
  });

  it("handles all-formatted result", () => {
    const data: FormatCheckResult = {
      formatted: true,
      files: [],
    };

    const compact = compactFormatCheckMap(data);

    expect(compact.formatted).toBe(true);
    expect(compact).not.toHaveProperty("files");
  });

  it("passes through error and exitCode (#1024)", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: [],
      error: "[error] Invalid configuration file `.prettierrc`",
      exitCode: 2,
    };

    const compact = compactFormatCheckMap(data);
    expect(compact.error).toBe(data.error);
    expect(compact.exitCode).toBe(2);
  });

  it("produces output that validates against FormatCheckResultSchema", () => {
    const files = Array.from({ length: COMPACT_FILE_LIMIT + 1 }, (_, i) => `src/file${i}.ts`);
    const compact = compactFormatCheckMap({ formatted: false, files });
    expect(FormatCheckResultSchema.safeParse(compact).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatFormatCheckCompact
// ---------------------------------------------------------------------------

describe("formatFormatCheckCompact", () => {
  it("formats when all files are formatted", () => {
    const compact = { formatted: true };
    expect(formatFormatCheckCompact(compact)).toBe("All files are formatted.");
  });

  it("formats when files need formatting but no list is available", () => {
    const compact = { formatted: false };
    expect(formatFormatCheckCompact(compact)).toBe("Some files need formatting.");
  });

  it("lists the failing files", () => {
    const compact = compactFormatCheckMap({
      formatted: false,
      files: ["src/index.ts", "src/utils.ts"],
    });
    expect(formatFormatCheckCompact(compact)).toBe(
      "2 files need formatting:\n  src/index.ts\n  src/utils.ts",
    );
  });

  it("notes omitted files when truncated", () => {
    const files = Array.from({ length: COMPACT_FILE_LIMIT + 5 }, (_, i) => `src/file${i}.ts`);
    const compact = compactFormatCheckMap({ formatted: false, files });
    const text = formatFormatCheckCompact(compact);
    expect(text).toContain(`${COMPACT_FILE_LIMIT + 5} files need formatting:`);
    expect(text).toContain("... (5 more files omitted)");
  });

  it("formats surfaced failures", () => {
    const compact = {
      formatted: false,
      error: "[error] Invalid configuration file",
      exitCode: 2,
    };
    expect(formatFormatCheckCompact(compact)).toBe(
      "Format check failed (exit 2): [error] Invalid configuration file",
    );
  });
});

// ---------------------------------------------------------------------------
// compactFormatWriteMap
// ---------------------------------------------------------------------------

describe("compactFormatWriteMap", () => {
  it("keeps counts and the reformatted file list (#1022)", () => {
    const data: FormatWriteResult = {
      filesChanged: 3,
      files: ["src/index.ts", "src/utils.ts", "src/config.ts"],
      success: true,
    };

    const compact = compactFormatWriteMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(3);
    expect(compact.files).toEqual(["src/index.ts", "src/utils.ts", "src/config.ts"]);
  });

  it("caps the file list at COMPACT_FILE_LIMIT with truncation metadata", () => {
    const files = Array.from({ length: COMPACT_FILE_LIMIT + 10 }, (_, i) => `src/file${i}.ts`);
    const data: FormatWriteResult = {
      filesChanged: files.length,
      files,
      success: true,
    };

    const compact = compactFormatWriteMap(data);

    expect(compact.files).toHaveLength(COMPACT_FILE_LIMIT);
    expect(compact.filesTruncated).toBe(true);
  });

  it("handles failed format result", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
    };

    const compact = compactFormatWriteMap(data);

    expect(compact.success).toBe(false);
    expect(compact.filesChanged).toBe(0);
    expect(compact).not.toHaveProperty("files");
  });

  it("keeps errorMessage for failed writes", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
      errorMessage: "No parser could be inferred",
    };

    const compact = compactFormatWriteMap(data);
    expect(compact.errorMessage).toBe("No parser could be inferred");
  });

  it("handles zero files changed (already formatted)", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: true,
    };

    const compact = compactFormatWriteMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(0);
    expect(compact).not.toHaveProperty("files");
  });
});

// ---------------------------------------------------------------------------
// formatFormatWriteCompact
// ---------------------------------------------------------------------------

describe("formatFormatWriteCompact", () => {
  it("formats failure", () => {
    const compact = { success: false, filesChanged: 0 };
    expect(formatFormatWriteCompact(compact)).toBe("Format failed.");
  });

  it("formats failure with errorMessage", () => {
    const compact = {
      success: false,
      filesChanged: 0,
      errorMessage: "No parser could be inferred",
    };
    expect(formatFormatWriteCompact(compact)).toBe("Format failed: No parser could be inferred");
  });

  it("formats zero files changed", () => {
    const compact = { success: true, filesChanged: 0 };
    expect(formatFormatWriteCompact(compact)).toBe("All files already formatted.");
  });

  it("lists formatted files", () => {
    const compact = compactFormatWriteMap({
      filesChanged: 2,
      files: ["src/a.ts", "src/b.ts"],
      success: true,
    });
    expect(formatFormatWriteCompact(compact)).toBe("Formatted 2 files:\n  src/a.ts\n  src/b.ts");
  });

  it("notes omitted files when truncated", () => {
    const files = Array.from({ length: COMPACT_FILE_LIMIT + 7 }, (_, i) => `src/file${i}.ts`);
    const compact = compactFormatWriteMap({
      filesChanged: files.length,
      files,
      success: true,
    });
    const text = formatFormatWriteCompact(compact);
    expect(text).toContain(`Formatted ${COMPACT_FILE_LIMIT + 7} files:`);
    expect(text).toContain("... (7 more files omitted)");
  });
});
