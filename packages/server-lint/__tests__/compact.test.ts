import { describe, it, expect } from "vitest";
import {
  compactLintMap,
  formatLintCompact,
  compactFormatCheckMap,
  formatFormatCheckCompact,
  compactFormatWriteMap,
  formatFormatWriteCompact,
} from "../src/lib/formatters.js";
import type { LintResult, FormatCheckResult, FormatWriteResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// compactLintMap
// ---------------------------------------------------------------------------

describe("compactLintMap", () => {
  it("keeps only counts, drops diagnostics", () => {
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

    const compact = compactLintMap(data);

    expect(compact.total).toBe(2);
    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(1);
    expect(compact.filesChecked).toBe(10);
    // Verify diagnostics are dropped
    expect(compact).not.toHaveProperty("diagnostics");
  });

  it("handles clean lint result", () => {
    const data: LintResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
      filesChecked: 25,
    };

    const compact = compactLintMap(data);

    expect(compact.total).toBe(0);
    expect(compact.filesChecked).toBe(25);
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

// ---------------------------------------------------------------------------
// formatLintCompact
// ---------------------------------------------------------------------------

describe("formatLintCompact", () => {
  it("formats clean lint result", () => {
    const compact = { total: 0, errors: 0, warnings: 0, filesChecked: 25 };
    expect(formatLintCompact(compact)).toBe("Lint: no issues found (25 files checked).");
  });

  it("formats lint result with counts", () => {
    const compact = { total: 5, errors: 2, warnings: 3, filesChecked: 10 };
    expect(formatLintCompact(compact)).toBe("Lint: 2 errors, 3 warnings across 10 files.");
  });
});

// ---------------------------------------------------------------------------
// compactLintMap with shellcheck-shaped data
// ---------------------------------------------------------------------------

describe("compactLintMap with shellcheck-shaped data", () => {
  it("keeps only counts, drops SC-code diagnostics", () => {
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
      total: 2,
      errors: 1,
      warnings: 0,
      filesChecked: 2,
    };

    const compact = compactLintMap(data);

    expect(compact.total).toBe(2);
    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(0);
    expect(compact.filesChecked).toBe(2);
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

// ---------------------------------------------------------------------------
// compactLintMap with hadolint-shaped data
// ---------------------------------------------------------------------------

describe("compactLintMap with hadolint-shaped data", () => {
  it("keeps only counts, drops DL-code diagnostics", () => {
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
      total: 2,
      errors: 1,
      warnings: 1,
      filesChecked: 1,
    };

    const compact = compactLintMap(data);

    expect(compact.total).toBe(2);
    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(1);
    expect(compact.filesChecked).toBe(1);
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

// ---------------------------------------------------------------------------
// compactFormatCheckMap
// ---------------------------------------------------------------------------

describe("compactFormatCheckMap", () => {
  it("keeps only formatted and total, drops file list", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: ["src/index.ts", "src/utils.ts", "src/config.ts"],
      total: 3,
    };

    const compact = compactFormatCheckMap(data);

    expect(compact.formatted).toBe(false);
    expect(compact.total).toBe(3);
    // Verify files are dropped
    expect(compact).not.toHaveProperty("files");
  });

  it("handles all-formatted result", () => {
    const data: FormatCheckResult = {
      formatted: true,
      files: [],
      total: 0,
    };

    const compact = compactFormatCheckMap(data);

    expect(compact.formatted).toBe(true);
    expect(compact.total).toBe(0);
    expect(compact).not.toHaveProperty("files");
  });
});

// ---------------------------------------------------------------------------
// formatFormatCheckCompact
// ---------------------------------------------------------------------------

describe("formatFormatCheckCompact", () => {
  it("formats when all files are formatted", () => {
    const compact = { formatted: true, total: 0 };
    expect(formatFormatCheckCompact(compact)).toBe("All files are formatted.");
  });

  it("formats when files need formatting", () => {
    const compact = { formatted: false, total: 5 };
    expect(formatFormatCheckCompact(compact)).toBe("5 files need formatting.");
  });
});

// ---------------------------------------------------------------------------
// compactFormatWriteMap
// ---------------------------------------------------------------------------

describe("compactFormatWriteMap", () => {
  it("keeps only success and filesChanged, drops file list", () => {
    const data: FormatWriteResult = {
      filesChanged: 3,
      files: ["src/index.ts", "src/utils.ts", "src/config.ts"],
      success: true,
    };

    const compact = compactFormatWriteMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(3);
    // Verify files are dropped
    expect(compact).not.toHaveProperty("files");
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

  it("formats zero files changed", () => {
    const compact = { success: true, filesChanged: 0 };
    expect(formatFormatWriteCompact(compact)).toBe("All files already formatted.");
  });

  it("formats files changed", () => {
    const compact = { success: true, filesChanged: 7 };
    expect(formatFormatWriteCompact(compact)).toBe("Formatted 7 files.");
  });
});
