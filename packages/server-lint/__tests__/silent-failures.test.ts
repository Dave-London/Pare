import { describe, it, expect } from "vitest";
import { surfaceEmptyFailure } from "@paretools/shared";
import {
  parseEslintJson,
  parseBiomeJson,
  parseStylelintJson,
  parseShellcheckJson,
  parseHadolintJson,
  parseOxlintJson,
  parsePrettierListDifferent,
} from "../src/lib/parsers.js";
import type { LintResult, FormatCheckResult } from "../src/schemas/index.js";

/**
 * Mirrors the composition used by every linter tool handler (#1024): the
 * parser sees only stdout, then surfaceEmptyFailure attaches the failure
 * evidence when the CLI exited non-zero with zero parsed diagnostics.
 */
function surfaceLint(
  data: LintResult,
  result: { exitCode: number; stdout: string; stderr: string },
) {
  return surfaceEmptyFailure(data, result, {
    isEmpty: (d) => (d.diagnostics ?? []).length === 0,
  });
}

// ---------------------------------------------------------------------------
// ESLint
// ---------------------------------------------------------------------------

describe("eslint silent-failure surfacing", () => {
  const violationsJson = JSON.stringify([
    {
      filePath: "/proj/src/index.ts",
      messages: [
        {
          ruleId: "no-unused-vars",
          severity: 2,
          message: "'foo' is defined but never used.",
          line: 5,
          column: 7,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    },
  ]);

  it("does NOT attach error when violations were found (exit 1 is normal)", () => {
    const result = { exitCode: 1, stdout: violationsJson, stderr: "" };
    const data = surfaceLint(parseEslintJson(result.stdout), result);

    expect(data.errors).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a config crash (exit 2, stderr, no JSON) instead of a false clean", () => {
    const stderr =
      "Oops! Something went wrong! :(\n\n" +
      "ESLint: 9.0.0\n\n" +
      "Error: Cannot find module 'eslint-plugin-foo'\n" +
      "Require stack:\n- /proj/eslint.config.js";
    const result = { exitCode: 2, stdout: "", stderr };
    const data = surfaceLint(parseEslintJson(result.stdout), result);

    expect(data.errors).toBe(0);
    expect(data.diagnostics).toEqual([]);
    expect(data.error).toContain("Cannot find module 'eslint-plugin-foo'");
    expect(data.exitCode).toBe(2);
  });

  it("provides a fallback message when both streams are empty", () => {
    const result = { exitCode: 2, stdout: "", stderr: "" };
    const data = surfaceLint(parseEslintJson(result.stdout), result);

    expect(data.error).toContain("exited with code 2");
    expect(data.exitCode).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Biome
// ---------------------------------------------------------------------------

describe("biome silent-failure surfacing", () => {
  it("does NOT attach error when diagnostics were found", () => {
    const stdout = JSON.stringify({
      summary: { errors: 1, warnings: 0 },
      diagnostics: [
        {
          category: "lint/suspicious/noExplicitAny",
          severity: "error",
          description: "Unexpected any.",
          location: { path: "src/index.ts", start: { line: 3, column: 12 } },
        },
      ],
    });
    const result = { exitCode: 1, stdout, stderr: "" };
    const data = surfaceLint(parseBiomeJson(result.stdout), result);

    expect(data.errors).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a config error instead of a false clean", () => {
    const stderr =
      "biome.json:5:3 deserialize ━━━━━━━━━━━━━━━━━━━\n" + "  ✖ Found an unknown key `linterr`.\n";
    const result = { exitCode: 1, stdout: "", stderr };
    const data = surfaceLint(parseBiomeJson(result.stdout), result);

    expect(data.filesChecked).toBe(0);
    expect(data.error).toContain("unknown key");
    expect(data.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Stylelint
// ---------------------------------------------------------------------------

describe("stylelint silent-failure surfacing", () => {
  it("does NOT attach error when violations were found (exit 2 is normal)", () => {
    const stdout = JSON.stringify([
      {
        source: "/proj/src/styles.css",
        warnings: [
          {
            line: 4,
            column: 3,
            rule: "block-no-empty",
            severity: "error",
            text: "Unexpected empty block (block-no-empty)",
          },
        ],
      },
    ]);
    const result = { exitCode: 2, stdout, stderr: "" };
    const data = surfaceLint(parseStylelintJson(result.stdout), result);

    expect(data.errors).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a missing-config crash instead of a false clean", () => {
    const stderr =
      "Error: No configuration provided for /proj/src/styles.css\n" +
      "    at getConfigForFile (/proj/node_modules/stylelint/lib/getConfigForFile.cjs:47:11)";
    const result = { exitCode: 78, stdout: "", stderr };
    const data = surfaceLint(parseStylelintJson(result.stdout), result);

    expect(data.diagnostics).toEqual([]);
    expect(data.error).toContain("No configuration provided");
    expect(data.exitCode).toBe(78);
  });
});

// ---------------------------------------------------------------------------
// ShellCheck
// ---------------------------------------------------------------------------

describe("shellcheck silent-failure surfacing", () => {
  it("does NOT attach error when issues were found (exit 1 is normal)", () => {
    const stdout = JSON.stringify([
      {
        file: "deploy.sh",
        line: 5,
        column: 8,
        level: "error",
        code: 2086,
        message: "Double quote to prevent globbing and word splitting.",
      },
    ]);
    const result = { exitCode: 1, stdout, stderr: "" };
    const data = surfaceLint(parseShellcheckJson(result.stdout), result);

    expect(data.errors).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces an unprocessable-file failure instead of a false clean", () => {
    const result = {
      exitCode: 2,
      stdout: "[]",
      stderr: "missing.sh: missing.sh: openBinaryFile: does not exist (No such file or directory)",
    };
    const data = surfaceLint(parseShellcheckJson(result.stdout), result);

    expect(data.diagnostics).toEqual([]);
    expect(data.error).toContain("does not exist");
    expect(data.exitCode).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Hadolint
// ---------------------------------------------------------------------------

describe("hadolint silent-failure surfacing", () => {
  it("does NOT attach error when violations were found (exit 1 is normal)", () => {
    const stdout = JSON.stringify([
      {
        file: "Dockerfile",
        line: 3,
        column: 1,
        level: "warning",
        code: "DL3008",
        message: "Pin versions in apt get install.",
      },
    ]);
    const result = { exitCode: 1, stdout, stderr: "" };
    const data = surfaceLint(parseHadolintJson(result.stdout), result);

    expect(data.warnings).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a missing-file failure instead of a false clean", () => {
    const result = {
      exitCode: 1,
      stdout: "",
      stderr: "hadolint: Dockerfile: openBinaryFile: does not exist (No such file or directory)",
    };
    const data = surfaceLint(parseHadolintJson(result.stdout), result);

    expect(data.diagnostics).toEqual([]);
    expect(data.error).toContain("does not exist");
    expect(data.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Oxlint
// ---------------------------------------------------------------------------

describe("oxlint silent-failure surfacing", () => {
  it("does NOT attach error when issues were found (exit 1 is normal)", () => {
    const stdout =
      JSON.stringify({
        file: "src/index.ts",
        line: 5,
        column: 7,
        message: "'foo' is declared but never used.",
        severity: "warning",
        ruleId: "no-unused-vars",
      }) + "\n";
    const result = { exitCode: 1, stdout, stderr: "" };
    const data = surfaceLint(parseOxlintJson(result.stdout), result);

    expect(data.warnings).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a bad-config crash instead of a false clean", () => {
    const result = {
      exitCode: 1,
      stdout: "",
      stderr: 'Failed to parse configuration file "oxlintrc.json": expected value at line 1',
    };
    const data = surfaceLint(parseOxlintJson(result.stdout), result);

    expect(data.diagnostics).toEqual([]);
    expect(data.error).toContain("Failed to parse configuration file");
    expect(data.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// format-check (prettier --list-different)
// ---------------------------------------------------------------------------

describe("format-check silent-failure surfacing", () => {
  /** Mirrors the composition used by the format-check tool handler. */
  function surfaceFormatCheck(result: { exitCode: number; stdout: string; stderr: string }) {
    const files = parsePrettierListDifferent(result.stdout);
    const data: FormatCheckResult = { formatted: result.exitCode === 0, files };
    return surfaceEmptyFailure(data, result, {
      // Prettier exits 1 when files differ (normal); >1 means the run failed.
      isEmpty: () => result.exitCode > 1,
    });
  }

  it("does NOT attach error when files need formatting (exit 1 is normal)", () => {
    const result = { exitCode: 1, stdout: "src/index.ts\nsrc/utils.ts\n", stderr: "" };
    const data = surfaceFormatCheck(result);

    expect(data.formatted).toBe(false);
    expect(data.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(data.error).toBeUndefined();
  });

  it("does NOT attach error on a clean check (exit 0)", () => {
    const result = { exitCode: 0, stdout: "", stderr: "" };
    const data = surfaceFormatCheck(result);

    expect(data.formatted).toBe(true);
    expect(data.error).toBeUndefined();
  });

  it("surfaces a config error (exit 2) instead of a silent empty result (#1024)", () => {
    const result = {
      exitCode: 2,
      stdout: "",
      stderr:
        "[error] Invalid configuration file `.prettierrc.json`: JSON Error in .prettierrc.json:\n" +
        "[error] Unexpected token } in JSON at position 42",
    };
    const data = surfaceFormatCheck(result);

    expect(data.formatted).toBe(false);
    expect(data.files).toEqual([]);
    expect(data.error).toContain("Invalid configuration file");
    expect(data.exitCode).toBe(2);
  });
});
