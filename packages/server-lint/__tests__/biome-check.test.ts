import { describe, it, expect } from "vitest";
import { parseBiomeJson } from "../src/lib/parsers.js";

describe("parseBiomeJson", () => {
  it("parses Biome JSON diagnostics with errors and warnings", () => {
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
});
