/**
 * Regression tests for #1022/#1025: compact mapper outputs must validate
 * against the registered Zod outputSchema the way the MCP SDK does (JSON
 * Schema with additionalProperties: false + AJV). Zod .parse() strips unknown
 * keys silently, so it cannot catch compact-only fields missing from schemas.
 */
import { describe, it, expect } from "vitest";
import { validateToolOutput } from "@paretools/shared/testing";
import {
  compactLintMap,
  compactFormatCheckMap,
  compactFormatWriteMap,
} from "../src/lib/formatters.js";
import {
  LintResultSchema,
  FormatCheckResultSchema,
  FormatWriteResultSchema,
} from "../src/schemas/index.js";
import type { LintResult, FormatCheckResult, FormatWriteResult } from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("lint (truncation + deprecationCount triggered)", () => {
    const data: LintResult = {
      errors: 20,
      warnings: 10,
      filesChecked: 12,
      diagnostics: Array.from({ length: 30 }, (_, i) => ({
        file: `src/file${i}.ts`,
        line: i + 1,
        column: 2,
        severity: i % 3 === 0 ? ("error" as const) : ("warning" as const),
        rule: "no-unused-vars",
        message: `unused var ${i}`,
      })),
      fixableErrorCount: 4,
      fixableWarningCount: 2,
      deprecations: [{ text: "rule X is deprecated", reference: "https://eslint.org" }],
      error: "tail",
      exitCode: 1,
    };
    const compact = compactLintMap(data);
    expect(compact.diagnosticsTruncated).toBe(true);
    expect(compact.deprecationCount).toBe(1);
    expectValid(LintResultSchema, compact);
  });

  it("format-check (truncation triggered)", () => {
    const data: FormatCheckResult = {
      formatted: false,
      files: Array.from({ length: 60 }, (_, i) => `src/file${i}.ts`),
      error: "tail",
      exitCode: 1,
    };
    const compact = compactFormatCheckMap(data);
    expect(compact.filesTruncated).toBe(true);
    expectValid(FormatCheckResultSchema, compact);
  });

  it("format-write (truncation triggered)", () => {
    const data: FormatWriteResult = {
      success: true,
      filesChanged: 60,
      filesUnchanged: 5,
      files: Array.from({ length: 60 }, (_, i) => `src/file${i}.ts`),
    };
    const compact = compactFormatWriteMap(data);
    expect(compact.filesTruncated).toBe(true);
    expectValid(FormatWriteResultSchema, compact);
  });

  it("format-write (error path)", () => {
    expectValid(
      FormatWriteResultSchema,
      compactFormatWriteMap({ success: false, filesChanged: 0, errorMessage: "prettier crashed" }),
    );
  });
});
