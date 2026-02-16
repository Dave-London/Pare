import { describe, it, expect } from "vitest";
import {
  parseEslintJson,
  parsePrettierCheck,
  parseStylelintJson,
  parseOxlintJson,
  parseShellcheckJson,
  parseHadolintJson,
} from "../src/lib/parsers.js";

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
        fixableErrorCount: 0,
        fixableWarningCount: 1,
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
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      },
    ]);

    const result = parseEslintJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
    expect(result.filesChecked).toBe(2);
    expect(result.fixableErrorCount).toBe(0);
    expect(result.fixableWarningCount).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "/project/src/index.ts",
      line: 5,
      column: 7,
      severity: "error",
      rule: "no-unused-vars",
      message: "'x' is defined but never used.",
    });
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].column).toBe(20);
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
    expect(result.fixableErrorCount).toBe(0);
    expect(result.fixableWarningCount).toBe(0);
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
    expect(result.diagnostics[0].column).toBe(1);
  });

  it("surfaces fixableErrorCount and fixableWarningCount", () => {
    const json = JSON.stringify([
      {
        filePath: "/project/src/a.ts",
        messages: [
          {
            ruleId: "semi",
            severity: 2,
            message: "Missing semicolon.",
            line: 1,
            column: 10,
            fix: { range: [10, 10], text: ";" },
          },
          { ruleId: "no-unused-vars", severity: 1, message: "Unused var.", line: 2 },
        ],
        errorCount: 1,
        warningCount: 1,
        fixableErrorCount: 1,
        fixableWarningCount: 0,
      },
      {
        filePath: "/project/src/b.ts",
        messages: [
          {
            ruleId: "quotes",
            severity: 1,
            message: "Use single quotes.",
            line: 5,
            column: 3,
            fix: { range: [50, 60], text: "'x'" },
          },
        ],
        errorCount: 0,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 1,
      },
    ]);

    const result = parseEslintJson(json);
    expect(result.fixableErrorCount).toBe(1);
    expect(result.fixableWarningCount).toBe(1);
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

// ---------------------------------------------------------------------------
// parseStylelintJson
// ---------------------------------------------------------------------------

describe("parseStylelintJson", () => {
  it("parses Stylelint JSON with errors and warnings", () => {
    const json = JSON.stringify([
      {
        source: "/project/src/styles.css",
        warnings: [
          {
            line: 5,
            column: 3,
            rule: "color-no-invalid-hex",
            severity: "error",
            text: 'Unexpected invalid hex color "#xyz" (color-no-invalid-hex)',
          },
          {
            line: 10,
            column: 1,
            rule: "declaration-block-no-duplicate-properties",
            severity: "warning",
            text: "Unexpected duplicate property (declaration-block-no-duplicate-properties)",
          },
        ],
      },
      {
        source: "/project/src/utils.css",
        warnings: [
          {
            line: 3,
            column: 1,
            rule: "block-no-empty",
            severity: "warning",
            text: "Unexpected empty block (block-no-empty)",
          },
        ],
      },
    ]);

    const result = parseStylelintJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "/project/src/styles.css",
      line: 5,
      column: 3,
      severity: "error",
      rule: "color-no-invalid-hex",
      message: 'Unexpected invalid hex color "#xyz" (color-no-invalid-hex)',
    });
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].column).toBe(1);
  });

  it("parses clean Stylelint output", () => {
    const json = JSON.stringify([{ source: "/project/src/styles.css", warnings: [] }]);

    const result = parseStylelintJson(json);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(1);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseStylelintJson("not json");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles null source", () => {
    const json = JSON.stringify([
      {
        source: null,
        warnings: [
          {
            line: 1,
            column: 1,
            rule: "some-rule",
            severity: "error",
            text: "Some error.",
          },
        ],
      },
    ]);

    const result = parseStylelintJson(json);
    expect(result.diagnostics[0].file).toBe("unknown");
    expect(result.diagnostics[0].column).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseOxlintJson
// ---------------------------------------------------------------------------

describe("parseOxlintJson", () => {
  it("parses Oxlint NDJSON with errors and warnings", () => {
    const lines = [
      JSON.stringify({
        file: "/project/src/index.ts",
        line: 5,
        column: 7,
        endLine: 5,
        endColumn: 8,
        severity: "error",
        ruleId: "no-unused-vars",
        message: "'x' is defined but never used.",
      }),
      JSON.stringify({
        file: "/project/src/index.ts",
        line: 10,
        column: 20,
        severity: "warning",
        ruleId: "no-console",
        message: "Unexpected console statement.",
        fix: { range: [100, 100], text: "" },
      }),
      JSON.stringify({
        file: "/project/src/utils.ts",
        line: 3,
        column: 1,
        severity: "warning",
        ruleId: "prefer-const",
        message: "'y' is never reassigned.",
      }),
    ].join("\n");

    const result = parseOxlintJson(lines);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "/project/src/index.ts",
      line: 5,
      column: 7,
      severity: "error",
      rule: "no-unused-vars",
      message: "'x' is defined but never used.",
    });
  });

  it("parses clean Oxlint output", () => {
    const result = parseOxlintJson("");
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(0);
  });

  it("handles invalid JSON lines gracefully", () => {
    const lines = [
      "not json",
      JSON.stringify({
        file: "src/a.ts",
        line: 1,
        column: 1,
        severity: "error",
        ruleId: "no-var",
        message: "Use let or const.",
      }),
    ].join("\n");

    const result = parseOxlintJson(lines);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].rule).toBe("no-var");
    expect(result.diagnostics[0].column).toBe(1);
  });

  it("handles missing ruleId", () => {
    const json = JSON.stringify({
      file: "src/a.ts",
      line: 1,
      column: 1,
      severity: "error",
      message: "Parse error.",
    });

    const result = parseOxlintJson(json);
    expect(result.diagnostics[0].rule).toBe("unknown");
  });

  it("skips summary lines without message", () => {
    const lines = [
      JSON.stringify({
        file: "src/a.ts",
        line: 1,
        column: 1,
        severity: "error",
        ruleId: "no-var",
        message: "Use let or const.",
      }),
      JSON.stringify({ total: 1, errors: 1, warnings: 0 }),
    ].join("\n");

    const result = parseOxlintJson(lines);
    expect(result.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseShellcheckJson
// ---------------------------------------------------------------------------

describe("parseShellcheckJson", () => {
  it("parses ShellCheck JSON with errors, warnings, and style issues", () => {
    const json = JSON.stringify([
      {
        file: "deploy.sh",
        line: 5,
        endLine: 5,
        column: 3,
        endColumn: 10,
        level: "error",
        code: 2086,
        message: "Double quote to prevent globbing and word splitting.",
      },
      {
        file: "deploy.sh",
        line: 10,
        endLine: 10,
        column: 1,
        endColumn: 5,
        level: "warning",
        code: 2034,
        message: "foo appears unused. Verify use (or export).",
      },
      {
        file: "build.sh",
        line: 3,
        endLine: 3,
        column: 1,
        endColumn: 8,
        level: "style",
        code: 2148,
        message: "Tips depend on target shell and target OS.",
      },
    ]);

    const result = parseShellcheckJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "deploy.sh",
      line: 5,
      column: 3,
      severity: "error",
      rule: "SC2086",
      message: "Double quote to prevent globbing and word splitting.",
    });
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].rule).toBe("SC2034");
    expect(result.diagnostics[1].column).toBe(1);
    expect(result.diagnostics[2].severity).toBe("info");
    expect(result.diagnostics[2].rule).toBe("SC2148");
    expect(result.diagnostics[2].column).toBe(1);
  });

  it("parses clean ShellCheck output (empty array)", () => {
    const result = parseShellcheckJson("[]");
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseShellcheckJson("not json");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles empty string gracefully", () => {
    const result = parseShellcheckJson("");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("maps info level correctly", () => {
    const json = JSON.stringify([
      {
        file: "test.sh",
        line: 1,
        column: 1,
        level: "info",
        code: 1234,
        message: "Some info.",
      },
    ]);

    const result = parseShellcheckJson(json);
    expect(result.diagnostics[0].severity).toBe("info");
    expect(result.diagnostics[0].column).toBe(1);
  });

  it("handles missing code", () => {
    const json = JSON.stringify([
      {
        file: "test.sh",
        line: 1,
        column: 1,
        level: "error",
        message: "Some error.",
      },
    ]);

    const result = parseShellcheckJson(json);
    expect(result.diagnostics[0].rule).toBe("unknown");
  });

  it("handles non-array JSON gracefully", () => {
    const json = JSON.stringify({ error: "something went wrong" });
    const result = parseShellcheckJson(json);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseHadolintJson
// ---------------------------------------------------------------------------

describe("parseHadolintJson", () => {
  it("parses Hadolint JSON with errors, warnings, and info issues", () => {
    const json = JSON.stringify([
      {
        file: "Dockerfile",
        line: 3,
        column: 1,
        level: "error",
        code: "DL3006",
        message: "Always tag the version of an image explicitly.",
      },
      {
        file: "Dockerfile",
        line: 7,
        column: 1,
        level: "warning",
        code: "DL3008",
        message: "Pin versions in apt get install.",
      },
      {
        file: "Dockerfile.dev",
        line: 1,
        column: 1,
        level: "info",
        code: "DL3048",
        message: "Invalid label key.",
      },
    ]);

    const result = parseHadolintJson(json);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.filesChecked).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "Dockerfile",
      line: 3,
      column: 1,
      severity: "error",
      rule: "DL3006",
      message: "Always tag the version of an image explicitly.",
      wikiUrl: "https://github.com/hadolint/hadolint/wiki/DL3006",
    });
    expect(result.diagnostics[1].severity).toBe("warning");
    expect(result.diagnostics[1].rule).toBe("DL3008");
    expect(result.diagnostics[1].wikiUrl).toBe("https://github.com/hadolint/hadolint/wiki/DL3008");
    expect(result.diagnostics[2].severity).toBe("info");
    expect(result.diagnostics[2].rule).toBe("DL3048");
    expect(result.diagnostics[2].wikiUrl).toBe("https://github.com/hadolint/hadolint/wiki/DL3048");
  });

  it("parses clean Hadolint output (empty array)", () => {
    const result = parseHadolintJson("[]");
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseHadolintJson("not json");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles empty string gracefully", () => {
    const result = parseHadolintJson("");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("maps style level to info", () => {
    const json = JSON.stringify([
      {
        file: "Dockerfile",
        line: 1,
        column: 1,
        level: "style",
        code: "DL3000",
        message: "Use absolute WORKDIR.",
      },
    ]);

    const result = parseHadolintJson(json);
    expect(result.diagnostics[0].severity).toBe("info");
    expect(result.diagnostics[0].wikiUrl).toBe("https://github.com/hadolint/hadolint/wiki/DL3000");
  });

  it("handles missing code", () => {
    const json = JSON.stringify([
      {
        file: "Dockerfile",
        line: 1,
        column: 1,
        level: "error",
        message: "Some error.",
      },
    ]);

    const result = parseHadolintJson(json);
    expect(result.diagnostics[0].rule).toBe("unknown");
    expect(result.diagnostics[0].wikiUrl).toBeUndefined();
  });

  it("handles non-array JSON gracefully", () => {
    const json = JSON.stringify({ error: "something went wrong" });
    const result = parseHadolintJson(json);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles SC-prefixed codes from ShellCheck-in-Hadolint", () => {
    const json = JSON.stringify([
      {
        file: "Dockerfile",
        line: 5,
        column: 1,
        level: "warning",
        code: "SC2046",
        message: "Quote this to prevent word splitting.",
      },
    ]);

    const result = parseHadolintJson(json);
    expect(result.diagnostics[0].rule).toBe("SC2046");
    // SC-prefixed rules should not get a wiki URL (only DL rules do)
    expect(result.diagnostics[0].wikiUrl).toBeUndefined();
  });
});
