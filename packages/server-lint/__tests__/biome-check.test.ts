import { describe, it, expect } from "vitest";
import { parseBiomeJson } from "../src/lib/parsers.js";

describe("parseBiomeJson", () => {
  it("parses Biome v2+ JSON with start/end line/column format", () => {
    const json = JSON.stringify({
      summary: { changed: 0, unchanged: 1, errors: 2, warnings: 1 },
      diagnostics: [
        {
          severity: "warning",
          message: "This let declares a variable that is only assigned once.",
          category: "lint/style/useConst",
          location: {
            path: "/tmp/test.ts",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 4 },
          },
          advices: [],
        },
        {
          severity: "error",
          message: "Using == may be unsafe if you are relying on type coercion.",
          category: "lint/suspicious/noDoubleEquals",
          location: {
            path: "/tmp/test.ts",
            start: { line: 1, column: 18 },
            end: { line: 1, column: 20 },
          },
          advices: [],
        },
        {
          severity: "error",
          message: "Formatter would have printed the following content:",
          category: "format",
          location: {
            path: "/tmp/test.ts",
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 },
          },
          advices: [],
        },
      ],
      command: "check",
    });

    const result = parseBiomeJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(1);
    expect(result.filesChecked).toBe(1);

    // Verify new format line/column extraction
    expect(result.diagnostics[0]).toEqual({
      file: "/tmp/test.ts",
      line: 1,
      column: 1,
      severity: "warning",
      rule: "lint/style/useConst",
      message: "This let declares a variable that is only assigned once.",
    });

    expect(result.diagnostics[1]).toEqual({
      file: "/tmp/test.ts",
      line: 1,
      column: 18,
      severity: "error",
      rule: "lint/suspicious/noDoubleEquals",
      message: "Using == may be unsafe if you are relying on type coercion.",
    });
  });

  it("parses old-format Biome JSON with sourceCode lineNumber/columnNumber", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "lint/suspicious/noDoubleEquals",
          severity: "error",
          description: "Use === instead of ==.",
          location: {
            path: { file: "src/index.ts" },
            span: { start: 100, end: 102 },
            sourceCode: { lineNumber: 5, columnNumber: 10 },
          },
          tags: ["fixable"],
        },
        {
          category: "lint/style/useConst",
          severity: "warning",
          description: "Use const instead of let.",
          location: {
            path: { file: "src/utils.ts" },
            span: { start: 200, end: 203 },
            sourceCode: { lineNumber: 12, columnNumber: 1 },
          },
          tags: [],
        },
      ],
    });

    const result = parseBiomeJson(json);

    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.filesChecked).toBe(2);

    expect(result.diagnostics[0]).toEqual({
      file: "src/index.ts",
      line: 5,
      column: 10,
      severity: "error",
      rule: "lint/suspicious/noDoubleEquals",
      message: "Use === instead of ==.",
    });

    expect(result.diagnostics[1]).toEqual({
      file: "src/utils.ts",
      line: 12,
      column: 1,
      severity: "warning",
      rule: "lint/style/useConst",
      message: "Use const instead of let.",
    });
  });

  it("parses clean Biome output (no diagnostics)", () => {
    const json = JSON.stringify({ diagnostics: [] });

    const result = parseBiomeJson(json);

    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseBiomeJson("not json");

    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles missing diagnostics field", () => {
    const json = JSON.stringify({});

    const result = parseBiomeJson(json);

    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("maps Biome severity levels correctly", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "rule-error",
          severity: "error",
          description: "Error diagnostic",
          location: { path: { file: "a.ts" } },
          tags: [],
        },
        {
          category: "rule-fatal",
          severity: "fatal",
          description: "Fatal diagnostic",
          location: { path: { file: "b.ts" } },
          tags: [],
        },
        {
          category: "rule-warning",
          severity: "warning",
          description: "Warning diagnostic",
          location: { path: { file: "c.ts" } },
          tags: [],
        },
        {
          category: "rule-info",
          severity: "information",
          description: "Info diagnostic",
          location: { path: { file: "d.ts" } },
          tags: [],
        },
        {
          category: "rule-hint",
          severity: "hint",
          description: "Hint diagnostic",
          location: { path: { file: "e.ts" } },
          tags: [],
        },
      ],
    });

    const result = parseBiomeJson(json);

    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.diagnostics[1].severity).toBe("error"); // fatal -> error
    expect(result.diagnostics[2].severity).toBe("warning");
    expect(result.diagnostics[3].severity).toBe("info"); // information -> info
    expect(result.diagnostics[4].severity).toBe("info"); // hint -> info
  });

  it("handles diagnostics without location info", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "parse/error",
          severity: "error",
          description: "Unexpected token.",
          tags: [],
        },
      ],
    });

    const result = parseBiomeJson(json);

    expect(result.diagnostics[0].file).toBe("unknown");
    expect(result.diagnostics[0].line).toBe(0);
    expect(result.diagnostics[0].column).toBeUndefined();
  });

  it("handles mixed lint and format diagnostics", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "lint/suspicious/noDoubleEquals",
          severity: "error",
          description: "Use === instead of ==.",
          location: {
            path: { file: "src/index.ts" },
            sourceCode: { lineNumber: 5, columnNumber: 10 },
          },
          tags: ["fixable"],
        },
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
          category: "lint/style/useConst",
          severity: "warning",
          description: "Use const.",
          location: {
            path: { file: "src/other.ts" },
            sourceCode: { lineNumber: 3, columnNumber: 5 },
          },
          tags: [],
        },
      ],
    });

    const result = parseBiomeJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(1);
    // Both src/index.ts entries count as one file
    expect(result.filesChecked).toBe(2);
  });

  it("uses message field as fallback when description is missing", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "parse/error",
          severity: "error",
          message: "Fallback message text",
          location: { path: { file: "a.ts" } },
          tags: [],
        },
      ],
    });

    const result = parseBiomeJson(json);
    expect(result.diagnostics[0].message).toBe("Fallback message text");
  });

  it("extracts line numbers from new format with start/end objects", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "lint/style/useConst",
          severity: "warning",
          message: "Use const instead of let.",
          location: {
            path: "src/main.ts",
            start: { line: 42, column: 5 },
            end: { line: 42, column: 8 },
          },
        },
      ],
    });

    const result = parseBiomeJson(json);
    expect(result.diagnostics[0].line).toBe(42);
    expect(result.diagnostics[0].column).toBe(5);
    expect(result.diagnostics[0].file).toBe("src/main.ts");
  });

  it("handles new format path as string (not object)", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "lint/suspicious/noDoubleEquals",
          severity: "error",
          message: "Use ===.",
          location: {
            path: "/absolute/path/to/file.ts",
            start: { line: 10, column: 3 },
            end: { line: 10, column: 5 },
          },
        },
      ],
    });

    const result = parseBiomeJson(json);
    expect(result.diagnostics[0].file).toBe("/absolute/path/to/file.ts");
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(3);
  });

  it("prefers new format start.line over old format sourceCode.lineNumber", () => {
    // Edge case: if both formats are present, new format should win
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "lint/style/useConst",
          severity: "warning",
          message: "Use const.",
          location: {
            path: "file.ts",
            start: { line: 99, column: 7 },
            end: { line: 99, column: 10 },
            sourceCode: { lineNumber: 1, columnNumber: 1 },
          },
        },
      ],
    });

    const result = parseBiomeJson(json);
    expect(result.diagnostics[0].line).toBe(99);
    expect(result.diagnostics[0].column).toBe(7);
  });

  it("handles diagnostics with location but no start/end and no sourceCode", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          category: "format",
          severity: "error",
          message: "File not formatted.",
          location: {
            path: "src/index.ts",
            span: { start: 0, end: 100 },
          },
        },
      ],
    });

    const result = parseBiomeJson(json);
    expect(result.diagnostics[0].file).toBe("src/index.ts");
    expect(result.diagnostics[0].line).toBe(0);
    expect(result.diagnostics[0].column).toBeUndefined();
  });
});
