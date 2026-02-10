import { describe, it, expect } from "vitest";
import { parseEslintJson, parsePrettierCheck } from "../src/lib/parsers.js";

describe("parseEslintJson", () => {
  it("parses ESLint JSON with errors and warnings", () => {
    const json = JSON.stringify([
      {
        filePath: "/project/src/index.ts",
        messages: [
          {
            ruleId: "no-unused-vars",
            severity: 2,
            message: "'x' is defined but never used.",
            line: 5,
            column: 7,
            endLine: 5,
            endColumn: 8,
            fix: null,
          },
          {
            ruleId: "semi",
            severity: 1,
            message: "Missing semicolon.",
            line: 10,
            column: 20,
            endLine: 10,
            endColumn: 20,
            fix: { range: [100, 100], text: ";" },
          },
        ],
        errorCount: 1,
        warningCount: 1,
      },
      {
        filePath: "/project/src/utils.ts",
        messages: [
          {
            ruleId: "no-console",
            severity: 1,
            message: "Unexpected console statement.",
            line: 3,
            column: 1,
            fix: null,
          },
        ],
        errorCount: 0,
        warningCount: 1,
      },
    ]);

    const result = parseEslintJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
    expect(result.fixable).toBe(1);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "/project/src/index.ts",
      line: 5,
      column: 7,
      endLine: 5,
      endColumn: 8,
      severity: "error",
      rule: "no-unused-vars",
      message: "'x' is defined but never used.",
      fixable: false,
    });
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].fixable).toBe(true);
  });

  it("parses clean ESLint output", () => {
    const json = JSON.stringify([
      { filePath: "/project/src/index.ts", messages: [], errorCount: 0, warningCount: 0 },
    ]);

    const result = parseEslintJson(json);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(1);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseEslintJson("not json");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles null ruleId", () => {
    const json = JSON.stringify([
      {
        filePath: "/project/src/index.ts",
        messages: [
          {
            ruleId: null,
            severity: 2,
            message: "Parsing error: unexpected token.",
            line: 1,
            column: 1,
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]);

    const result = parseEslintJson(json);
    expect(result.diagnostics[0].rule).toBe("unknown");
  });
});

describe("parsePrettierCheck", () => {
  it("parses unformatted files", () => {
    const stdout = [
      "Checking formatting...",
      "[warn] src/index.ts",
      "[warn] src/utils.ts",
      "[warn] Code style issues found in 2 files. Run Prettier to fix.",
    ].join("\n");

    const result = parsePrettierCheck(stdout, "", 1);

    expect(result.formatted).toBe(false);
    expect(result.total).toBe(2);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("parses all-formatted output", () => {
    const stdout = "Checking formatting...\nAll matched files use Prettier code style!";
    const result = parsePrettierCheck(stdout, "", 0);

    expect(result.formatted).toBe(true);
    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles empty output", () => {
    const result = parsePrettierCheck("", "", 0);
    expect(result.formatted).toBe(true);
    expect(result.files).toEqual([]);
  });
});
