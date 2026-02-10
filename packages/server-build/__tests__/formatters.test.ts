import { describe, it, expect } from "vitest";
import { formatTsc, formatBuildCommand } from "../src/lib/formatters.js";
import type { TscResult, BuildResult } from "../src/schemas/index.js";

describe("formatTsc", () => {
  it("formats clean tsc result with no errors", () => {
    const data: TscResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatTsc(data)).toBe("TypeScript: no errors found.");
  });

  it("formats tsc result with errors and warnings", () => {
    const data: TscResult = {
      success: false,
      diagnostics: [
        {
          file: "src/index.ts",
          line: 10,
          column: 5,
          code: 2322,
          severity: "error",
          message: "Type 'string' is not assignable to type 'number'.",
        },
        {
          file: "src/utils.ts",
          line: 3,
          column: 1,
          code: 6133,
          severity: "warning",
          message: "'x' is declared but its value is never read.",
        },
      ],
      total: 2,
      errors: 1,
      warnings: 1,
    };
    const output = formatTsc(data);
    expect(output).toContain("TypeScript: 1 errors, 1 warnings");
    expect(output).toContain(
      "src/index.ts:10:5 error TS2322: Type 'string' is not assignable to type 'number'.",
    );
    expect(output).toContain(
      "src/utils.ts:3:1 warning TS6133: 'x' is declared but its value is never read.",
    );
  });

  it("formats tsc result with only errors", () => {
    const data: TscResult = {
      success: false,
      diagnostics: [
        {
          file: "src/main.ts",
          line: 1,
          column: 1,
          code: 1005,
          severity: "error",
          message: "';' expected.",
        },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatTsc(data);
    expect(output).toContain("TypeScript: 1 errors, 0 warnings");
    expect(output).toContain("src/main.ts:1:1 error TS1005: ';' expected.");
  });
});

describe("formatBuildCommand", () => {
  it("formats successful build with no warnings", () => {
    const data: BuildResult = {
      success: true,
      duration: 8.3,
      errors: [],
      warnings: [],
    };
    expect(formatBuildCommand(data)).toBe("Build succeeded in 8.3s");
  });

  it("formats successful build with warnings", () => {
    const data: BuildResult = {
      success: true,
      duration: 12.0,
      errors: [],
      warnings: ["Unused import in src/config.ts", "Deprecated API usage"],
    };
    const output = formatBuildCommand(data);
    expect(output).toBe("Build succeeded in 12s, 2 warnings");
  });

  it("formats failed build with errors", () => {
    const data: BuildResult = {
      success: false,
      duration: 2.5,
      errors: ["Module not found: ./missing", "Syntax error in src/app.ts:15"],
      warnings: [],
    };
    const output = formatBuildCommand(data);
    expect(output).toContain("Build failed (2.5s)");
    expect(output).toContain("Module not found: ./missing");
    expect(output).toContain("Syntax error in src/app.ts:15");
  });
});
