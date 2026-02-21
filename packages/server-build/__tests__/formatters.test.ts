import { describe, it, expect } from "vitest";
import {
  formatTsc,
  formatBuildCommand,
  formatLerna,
  compactLernaMap,
  formatLernaCompact,
  formatRollup,
  compactRollupMap,
  formatRollupCompact,
} from "../src/lib/formatters.js";
import type { TscResult, BuildResult, LernaResult, RollupResult } from "../src/schemas/index.js";

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

describe("formatLerna", () => {
  it("formats success with packages", () => {
    const data: LernaResult = {
      success: true,
      action: "list",
      duration: 1.5,
      packages: [
        { name: "@scope/core", version: "1.0.0", location: "/packages/core" },
        { name: "@scope/utils", version: "2.0.0", private: true },
      ],
    };
    const output = formatLerna(data);
    expect(output).toContain("lerna list: succeeded in 1.5s");
    expect(output).toContain("2 packages:");
    expect(output).toContain("@scope/core@1.0.0");
    expect(output).toContain("@ /packages/core");
    expect(output).toContain("@scope/utils@2.0.0 (private)");
  });

  it("formats success with output (run action)", () => {
    const data: LernaResult = {
      success: true,
      action: "run",
      duration: 3.0,
      output: "Building packages...\nDone.",
    };
    const output = formatLerna(data);
    expect(output).toContain("lerna run: succeeded in 3s");
    expect(output).toContain("output: 2 lines");
  });

  it("formats failure with errors", () => {
    const data: LernaResult = {
      success: false,
      action: "run",
      duration: 2.0,
      errors: ["Error: Command failed with exit code 1"],
    };
    const output = formatLerna(data);
    expect(output).toContain("lerna run: failed (2s)");
    expect(output).toContain("Error: Command failed with exit code 1");
  });
});

describe("compactLernaMap", () => {
  it("maps correctly", () => {
    const data: LernaResult = {
      success: true,
      action: "list",
      duration: 1.0,
      packages: [
        { name: "@scope/a", version: "1.0.0" },
        { name: "@scope/b", version: "2.0.0" },
      ],
    };
    const compact = compactLernaMap(data);
    expect(compact.success).toBe(true);
    expect(compact.action).toBe("list");
    expect(compact.duration).toBe(1.0);
    expect(compact.packageCount).toBe(2);
    expect(compact.errors).toBeUndefined();
  });

  it("includes errors when present", () => {
    const data: LernaResult = {
      success: false,
      action: "run",
      duration: 0.5,
      errors: ["Error: build failed"],
    };
    const compact = compactLernaMap(data);
    expect(compact.success).toBe(false);
    expect(compact.packageCount).toBe(0);
    expect(compact.errors).toEqual(["Error: build failed"]);
  });
});

describe("formatLernaCompact", () => {
  it("formats success one-liner", () => {
    const output = formatLernaCompact({
      success: true,
      action: "list",
      duration: 1.2,
      packageCount: 5,
    });
    expect(output).toBe("lerna list: succeeded in 1.2s, 5 packages");
  });

  it("formats failure one-liner", () => {
    const output = formatLernaCompact({
      success: false,
      action: "run",
      duration: 2.5,
      packageCount: 0,
    });
    expect(output).toBe("lerna run: failed (2.5s)");
  });
});

describe("formatRollup", () => {
  it("formats success with bundles and warnings", () => {
    const data: RollupResult = {
      success: true,
      duration: 1.5,
      bundles: [
        { input: "src/index.js", output: "dist/bundle.js" },
        { input: "src/index.js", output: "dist/bundle.esm.js" },
      ],
      warnings: ["Unresolved dependencies"],
    };
    const output = formatRollup(data);
    expect(output).toContain("rollup: build succeeded in 1.5s");
    expect(output).toContain("2 bundles");
    expect(output).toContain("1 warnings");
    expect(output).toContain("src/index.js \u2192 dist/bundle.js");
    expect(output).toContain("src/index.js \u2192 dist/bundle.esm.js");
    expect(output).toContain("WARN: Unresolved dependencies");
  });

  it("formats failure with errors", () => {
    const data: RollupResult = {
      success: false,
      duration: 0.5,
      errors: [
        { file: "src/index.js", line: 10, column: 5, message: "Unexpected token" },
        { message: "Plugin error" },
      ],
      warnings: ["Some warning"],
    };
    const output = formatRollup(data);
    expect(output).toContain("rollup: build failed (0.5s)");
    expect(output).toContain("2 errors");
    expect(output).toContain("1 warnings");
    expect(output).toContain("ERROR src/index.js:10:5: Unexpected token");
    expect(output).toContain("ERROR: Plugin error");
    expect(output).toContain("WARN: Some warning");
  });
});

describe("compactRollupMap", () => {
  it("maps correctly", () => {
    const data: RollupResult = {
      success: true,
      duration: 2.0,
      bundles: [{ input: "src/index.js", output: "dist/bundle.js" }],
    };
    const compact = compactRollupMap(data);
    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(2.0);
    expect(compact.bundleCount).toBe(1);
    expect(compact.errors).toBeUndefined();
    expect(compact.warnings).toBeUndefined();
  });
});

describe("formatRollupCompact", () => {
  it("formats success one-liner", () => {
    const output = formatRollupCompact({
      success: true,
      duration: 1.5,
      bundleCount: 3,
    });
    expect(output).toBe("rollup: build succeeded in 1.5s, 3 bundles");
  });

  it("formats failure one-liner", () => {
    const output = formatRollupCompact({
      success: false,
      duration: 0.8,
      bundleCount: 0,
    });
    expect(output).toBe("rollup: build failed (0.8s)");
  });
});
