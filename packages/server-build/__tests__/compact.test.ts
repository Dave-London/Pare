import { describe, it, expect } from "vitest";
import {
  compactTscMap,
  formatTscCompact,
  compactEsbuildMap,
  formatEsbuildCompact,
  compactViteBuildMap,
  formatViteBuildCompact,
  compactWebpackMap,
  formatWebpackCompact,
  compactBuildMap,
  formatBuildCompact,
  compactTurboMap,
  formatTurboCompact,
} from "../src/lib/formatters.js";
import type {
  TscResult,
  EsbuildResult,
  ViteBuildResult,
  WebpackResult,
  BuildResult,
  TurboResult,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// tsc compact
// ---------------------------------------------------------------------------

describe("compactTscMap", () => {
  it("keeps success, counts, and truncated diagnostics (file:line only)", () => {
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

    const compact = compactTscMap(data);

    expect(compact.success).toBe(false);
    expect(compact.errors).toBe(1);
    expect(compact.warnings).toBe(1);
    expect(compact.diagnostics).toHaveLength(2);
    expect(compact.diagnostics[0]).toEqual({
      file: "src/index.ts",
      line: 10,
      severity: "error",
    });
    expect(compact.diagnostics[1]).toEqual({
      file: "src/utils.ts",
      line: 3,
      severity: "warning",
    });
    // Verify dropped fields
    expect(compact.diagnostics[0]).not.toHaveProperty("column");
    expect(compact.diagnostics[0]).not.toHaveProperty("code");
    expect(compact.diagnostics[0]).not.toHaveProperty("message");
    expect(compact).not.toHaveProperty("total");
  });

  it("limits diagnostics to 10 entries", () => {
    const diagnostics = Array.from({ length: 20 }, (_, i) => ({
      file: `src/file${i}.ts`,
      line: i + 1,
      column: 1,
      code: 2322,
      severity: "error" as const,
      message: "Some error",
    }));

    const data: TscResult = {
      success: false,
      diagnostics,
      total: 20,
      errors: 20,
      warnings: 0,
    };

    const compact = compactTscMap(data);
    expect(compact.diagnostics).toHaveLength(10);
    expect(compact.diagnostics[9].file).toBe("src/file9.ts");
  });

  it("handles clean build with no diagnostics", () => {
    const data: TscResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };

    const compact = compactTscMap(data);

    expect(compact.success).toBe(true);
    expect(compact.errors).toBe(0);
    expect(compact.warnings).toBe(0);
    expect(compact.diagnostics).toEqual([]);
  });
});

describe("formatTscCompact", () => {
  it("formats clean result", () => {
    const compact = { success: true, errors: 0, warnings: 0, diagnostics: [] };
    expect(formatTscCompact(compact)).toBe("TypeScript: no errors found.");
  });

  it("formats compact diagnostics with file:line only", () => {
    const compact = {
      success: false,
      errors: 1,
      warnings: 1,
      diagnostics: [
        { file: "src/index.ts", line: 10, severity: "error" },
        { file: "src/utils.ts", line: 3, severity: "warning" },
      ],
    };
    const output = formatTscCompact(compact);
    expect(output).toContain("TypeScript: 1 errors, 1 warnings");
    expect(output).toContain("src/index.ts:10 error");
    expect(output).toContain("src/utils.ts:3 warning");
    // Should NOT contain message text or codes
    expect(output).not.toContain("TS2322");
    expect(output).not.toContain("assignable");
  });
});

// ---------------------------------------------------------------------------
// esbuild compact
// ---------------------------------------------------------------------------

describe("compactEsbuildMap", () => {
  it("keeps success and duration; includes errors/warnings when non-empty", () => {
    const data: EsbuildResult = {
      success: false,
      errors: [
        { file: "src/index.ts", line: 10, column: 5, message: 'Could not resolve "./missing"' },
        { message: "Another error" },
      ],
      warnings: [{ file: "src/utils.ts", line: 1, message: "Unused import" }],
      outputFiles: ["dist/index.js", "dist/index.css"],
      duration: 1.5,
    };

    const compact = compactEsbuildMap(data);

    expect(compact.success).toBe(false);
    expect(compact.duration).toBe(1.5);
    // Error/warning arrays preserved when non-empty
    expect(compact.errors).toHaveLength(2);
    expect(compact.warnings).toHaveLength(1);
    // Verify other fields are still dropped
    expect(compact).not.toHaveProperty("outputFiles");
    expect(compact).not.toHaveProperty("errorCount");
    expect(compact).not.toHaveProperty("warningCount");
    expect(compact).not.toHaveProperty("outputFileCount");
  });

  it("handles successful build with no output files", () => {
    const data: EsbuildResult = {
      success: true,
      errors: [],
      warnings: [],
      duration: 0.3,
    };

    const compact = compactEsbuildMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(0.3);
  });
});

describe("formatEsbuildCompact", () => {
  it("formats successful build", () => {
    const compact = {
      success: true,
      duration: 0.5,
    };
    const output = formatEsbuildCompact(compact);
    expect(output).toContain("build succeeded in 0.5s");
  });

  it("formats failed build", () => {
    const compact = {
      success: false,
      duration: 0.1,
    };
    const output = formatEsbuildCompact(compact);
    expect(output).toContain("build failed");
  });
});

// ---------------------------------------------------------------------------
// vite-build compact
// ---------------------------------------------------------------------------

describe("compactViteBuildMap", () => {
  it("keeps success and duration; includes warnings when non-empty", () => {
    const data: ViteBuildResult = {
      success: true,
      duration: 1.5,
      outputs: [
        { file: "dist/index.html", size: "0.45 kB" },
        { file: "dist/assets/index.js", size: "52.31 kB" },
        { file: "dist/assets/vendor.js", size: "142.05 kB" },
      ],
      errors: [],
      warnings: ["Chunk size warning"],
    };

    const compact = compactViteBuildMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(1.5);
    // Warnings preserved when non-empty; empty errors omitted
    expect(compact.warnings).toEqual(["Chunk size warning"]);
    expect(compact).not.toHaveProperty("errors");
    // Verify other fields are still dropped
    expect(compact).not.toHaveProperty("outputs");
    expect(compact).not.toHaveProperty("fileCount");
    expect(compact).not.toHaveProperty("errorCount");
    expect(compact).not.toHaveProperty("warningCount");
  });

  it("handles failed build", () => {
    const data: ViteBuildResult = {
      success: false,
      duration: 0.5,
      outputs: [],
      errors: ["Build error 1", "Build error 2"],
      warnings: [],
    };

    const compact = compactViteBuildMap(data);

    expect(compact.success).toBe(false);
    expect(compact.duration).toBe(0.5);
  });
});

describe("formatViteBuildCompact", () => {
  it("formats successful build", () => {
    const compact = {
      success: true,
      duration: 1.2,
    };
    const output = formatViteBuildCompact(compact);
    expect(output).toContain("Vite build succeeded in 1.2s");
  });

  it("formats failed build", () => {
    const compact = {
      success: false,
      duration: 0.5,
    };
    const output = formatViteBuildCompact(compact);
    expect(output).toContain("Vite build failed (0.5s)");
  });
});

// ---------------------------------------------------------------------------
// webpack compact
// ---------------------------------------------------------------------------

describe("compactWebpackMap", () => {
  it("keeps success, duration, and modules; drops arrays", () => {
    const data: WebpackResult = {
      success: true,
      duration: 2.5,
      assets: [
        { name: "main.js", size: 52480 },
        { name: "vendor.js", size: 143360 },
        { name: "styles.css", size: 8192 },
      ],
      errors: [],
      warnings: [],
      modules: 42,
    };

    const compact = compactWebpackMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(2.5);
    expect(compact.modules).toBe(42);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("assets");
    expect(compact).not.toHaveProperty("errors");
    expect(compact).not.toHaveProperty("warnings");
    expect(compact).not.toHaveProperty("assetCount");
    expect(compact).not.toHaveProperty("totalSize");
    expect(compact).not.toHaveProperty("errorCount");
    expect(compact).not.toHaveProperty("warningCount");
  });

  it("handles empty build without modules", () => {
    const data: WebpackResult = {
      success: true,
      duration: 0.1,
      assets: [],
      errors: [],
      warnings: [],
    };

    const compact = compactWebpackMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(0.1);
    expect(compact.modules).toBeUndefined();
  });

  it("handles failed build", () => {
    const data: WebpackResult = {
      success: false,
      duration: 1.0,
      assets: [],
      errors: ["Module not found", "Compilation failed"],
      warnings: ["Deprecation warning"],
    };

    const compact = compactWebpackMap(data);

    expect(compact.success).toBe(false);
    expect(compact.duration).toBe(1.0);
  });
});

describe("formatWebpackCompact", () => {
  it("formats successful build with modules", () => {
    const compact = {
      success: true,
      duration: 2.5,
      modules: 42,
    };
    const output = formatWebpackCompact(compact);
    expect(output).toContain("webpack: build succeeded in 2.5s");
    expect(output).toContain("42 modules");
  });

  it("formats failed build", () => {
    const compact = {
      success: false,
      duration: 1.0,
    };
    const output = formatWebpackCompact(compact);
    expect(output).toContain("webpack: build failed (1s)");
  });

  it("formats build with no modules", () => {
    const compact = {
      success: true,
      duration: 0.1,
    };
    const output = formatWebpackCompact(compact);
    expect(output).toBe("webpack: build succeeded in 0.1s");
  });
});

// ---------------------------------------------------------------------------
// build (generic) compact
// ---------------------------------------------------------------------------

describe("compactBuildMap", () => {
  it("keeps success and duration; includes errors/warnings when non-empty", () => {
    const data: BuildResult = {
      success: false,
      duration: 2.5,
      errors: ["Module not found: ./missing", "Syntax error in src/app.ts:15"],
      warnings: ["Unused variable"],
    };

    const compact = compactBuildMap(data);

    expect(compact.success).toBe(false);
    expect(compact.duration).toBe(2.5);
    // Error/warning arrays preserved when non-empty
    expect(compact.errors).toEqual([
      "Module not found: ./missing",
      "Syntax error in src/app.ts:15",
    ]);
    expect(compact.warnings).toEqual(["Unused variable"]);
    // Verify other fields are still dropped
    expect(compact).not.toHaveProperty("errorCount");
    expect(compact).not.toHaveProperty("warningCount");
  });

  it("handles successful build with no issues", () => {
    const data: BuildResult = {
      success: true,
      duration: 8.3,
      errors: [],
      warnings: [],
    };

    const compact = compactBuildMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(8.3);
  });
});

describe("formatBuildCompact", () => {
  it("formats successful build", () => {
    const compact = {
      success: true,
      duration: 8.3,
    };
    expect(formatBuildCompact(compact)).toBe("Build succeeded in 8.3s");
  });

  it("formats failed build", () => {
    const compact = {
      success: false,
      duration: 2.5,
    };
    const output = formatBuildCompact(compact);
    expect(output).toContain("Build failed (2.5s)");
  });
});

// ---------------------------------------------------------------------------
// turbo compact
// ---------------------------------------------------------------------------

describe("compactTurboMap", () => {
  it("keeps summary counts; drops tasks array", () => {
    const data: TurboResult = {
      success: true,
      duration: 5.0,
      tasks: [
        {
          package: "@paretools/shared",
          task: "build",
          status: "pass",
          duration: "100ms",
          cache: "hit",
        },
        {
          package: "@paretools/git",
          task: "build",
          status: "pass",
          duration: "2.5s",
          cache: "miss",
        },
      ],
      totalTasks: 2,
      passed: 2,
      failed: 0,
      cached: 1,
    };

    const compact = compactTurboMap(data);

    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(5.0);
    expect(compact.totalTasks).toBe(2);
    expect(compact.passed).toBe(2);
    expect(compact.failed).toBe(0);
    expect(compact.cached).toBe(1);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("tasks");
  });

  it("handles failed run", () => {
    const data: TurboResult = {
      success: false,
      duration: 3.2,
      tasks: [
        { package: "@paretools/shared", task: "build", status: "pass", cache: "hit" },
        { package: "@paretools/git", task: "build", status: "fail", cache: "miss" },
      ],
      totalTasks: 2,
      passed: 1,
      failed: 1,
      cached: 1,
    };

    const compact = compactTurboMap(data);

    expect(compact.success).toBe(false);
    expect(compact.passed).toBe(1);
    expect(compact.failed).toBe(1);
  });

  it("handles empty run", () => {
    const data: TurboResult = {
      success: true,
      duration: 0.05,
      tasks: [],
      totalTasks: 0,
      passed: 0,
      failed: 0,
      cached: 0,
    };

    const compact = compactTurboMap(data);

    expect(compact.success).toBe(true);
    expect(compact.totalTasks).toBe(0);
  });
});

describe("formatTurboCompact", () => {
  it("formats successful run with cached tasks", () => {
    const compact = {
      success: true,
      duration: 2.5,
      totalTasks: 3,
      passed: 3,
      failed: 0,
      cached: 2,
    };
    const output = formatTurboCompact(compact);
    expect(output).toContain("turbo: 3 tasks completed in 2.5s");
    expect(output).toContain("2 cached");
  });

  it("formats failed run", () => {
    const compact = {
      success: false,
      duration: 3.2,
      totalTasks: 2,
      passed: 1,
      failed: 1,
      cached: 0,
    };
    const output = formatTurboCompact(compact);
    expect(output).toContain("turbo: failed (3.2s)");
    expect(output).toContain("1 passed");
    expect(output).toContain("1 failed");
  });

  it("formats run with no cached tasks", () => {
    const compact = {
      success: true,
      duration: 5.0,
      totalTasks: 1,
      passed: 1,
      failed: 0,
      cached: 0,
    };
    const output = formatTurboCompact(compact);
    expect(output).toBe("turbo: 1 tasks completed in 5s");
  });
});
