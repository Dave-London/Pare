import { describe, it, expect } from "vitest";
import {
  formatDotnetBuild,
  compactBuildMap,
  formatBuildCompact,
  formatDotnetTest,
  compactTestMap,
  formatTestCompact,
  formatDotnetRun,
  compactRunMap,
  formatRunCompact,
  formatDotnetPublish,
  formatDotnetRestore,
  compactRestoreMap,
  formatDotnetClean,
  formatDotnetAddPackage,
  compactAddPackageMap,
  formatDotnetListPackage,
  compactListPackageMap,
  formatListPackageCompact,
} from "../src/lib/formatters.js";
import type {
  DotnetBuildResult,
  DotnetTestResult,
  DotnetRunResult,
  DotnetPublishResult,
  DotnetRestoreResult,
  DotnetCleanResult,
  DotnetAddPackageResult,
  DotnetListPackageResult,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

describe("formatDotnetBuild", () => {
  it("formats successful build with no diagnostics", () => {
    const data: DotnetBuildResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatDotnetBuild(data)).toBe("dotnet build: success, no diagnostics.");
  });

  it("formats failed build with errors", () => {
    const data: DotnetBuildResult = {
      success: false,
      diagnostics: [
        {
          file: "Program.cs",
          line: 10,
          column: 5,
          severity: "error",
          code: "CS1002",
          message: "; expected",
        },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatDotnetBuild(data);
    expect(output).toContain("dotnet build: failed (1 errors, 0 warnings)");
    expect(output).toContain("Program.cs(10,5) error CS1002: ; expected");
  });
});

describe("compactBuildMap + formatBuildCompact", () => {
  it("produces compact build output", () => {
    const data: DotnetBuildResult = {
      success: false,
      diagnostics: [
        { file: "A.cs", line: 1, column: 1, severity: "error", code: "CS0001", message: "err" },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const compact = compactBuildMap(data);
    expect(compact.success).toBe(false);
    expect(compact.errors).toBe(1);
    expect(compact.diagnostics).toHaveLength(1);
    expect(compact.diagnostics[0].file).toBe("A.cs");

    const text = formatBuildCompact(compact);
    expect(text).toContain("1 errors");
  });

  it("formats compact with no diagnostics", () => {
    const compact = compactBuildMap({
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    });
    expect(formatBuildCompact(compact)).toBe("dotnet build: success, no diagnostics.");
  });
});

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

describe("formatDotnetTest", () => {
  it("formats passing tests", () => {
    const data: DotnetTestResult = {
      success: true,
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      tests: [
        { name: "Test1", status: "Passed", duration: "1 ms" },
        { name: "Test2", status: "Passed", duration: "2 ms" },
      ],
    };
    const output = formatDotnetTest(data);
    expect(output).toContain("passed");
    expect(output).toContain("2 passed");
  });

  it("formats failing tests with error message", () => {
    const data: DotnetTestResult = {
      success: false,
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      tests: [
        { name: "FailTest", status: "Failed", duration: "5 ms", errorMessage: "Assert failed" },
      ],
    };
    const output = formatDotnetTest(data);
    expect(output).toContain("failed");
    expect(output).toContain("Assert failed");
  });
});

describe("compactTestMap + formatTestCompact", () => {
  it("includes failed test names in compact output", () => {
    const data: DotnetTestResult = {
      success: false,
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      tests: [
        { name: "GoodTest", status: "Passed" },
        { name: "BadTest", status: "Failed" },
      ],
    };
    const compact = compactTestMap(data);
    expect(compact.failedTests).toEqual(["BadTest"]);

    const text = formatTestCompact(compact);
    expect(text).toContain("BadTest");
  });
});

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

describe("formatDotnetRun", () => {
  it("formats successful run", () => {
    const data: DotnetRunResult = { success: true, exitCode: 0, stdout: "output" };
    expect(formatDotnetRun(data)).toContain("success");
  });

  it("formats timed out run", () => {
    const data: DotnetRunResult = { success: false, exitCode: 1, timedOut: true };
    expect(formatDotnetRun(data)).toContain("timed out");
  });
});

describe("compactRunMap + formatRunCompact", () => {
  it("strips stdout/stderr in compact mode", () => {
    const data: DotnetRunResult = { success: true, exitCode: 0, stdout: "big output" };
    const compact = compactRunMap(data);
    expect(compact).not.toHaveProperty("stdout");
    expect(formatRunCompact(compact)).toContain("success");
  });
});

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

describe("formatDotnetPublish", () => {
  it("formats successful publish with output path", () => {
    const data: DotnetPublishResult = {
      success: true,
      exitCode: 0,
      outputPath: "/publish/dir",
    };
    const output = formatDotnetPublish(data);
    expect(output).toContain("success");
    expect(output).toContain("/publish/dir");
  });

  it("formats failed publish", () => {
    const data: DotnetPublishResult = {
      success: false,
      exitCode: 1,
      errors: ["Build failed."],
    };
    expect(formatDotnetPublish(data)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

describe("formatDotnetRestore", () => {
  it("formats successful restore with project count", () => {
    const data: DotnetRestoreResult = {
      success: true,
      exitCode: 0,
      restoredProjects: 3,
    };
    expect(formatDotnetRestore(data)).toContain("3 projects restored");
  });
});

describe("compactRestoreMap", () => {
  it("preserves project count", () => {
    const data: DotnetRestoreResult = { success: true, exitCode: 0, restoredProjects: 2 };
    const compact = compactRestoreMap(data);
    expect(compact.restoredProjects).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

describe("formatDotnetClean", () => {
  it("formats successful clean", () => {
    const data: DotnetCleanResult = { success: true, exitCode: 0 };
    expect(formatDotnetClean(data)).toBe("dotnet clean: success");
  });

  it("formats failed clean", () => {
    const data: DotnetCleanResult = { success: false, exitCode: 1 };
    expect(formatDotnetClean(data)).toContain("failed");
  });
});

// ---------------------------------------------------------------------------
// add-package
// ---------------------------------------------------------------------------

describe("formatDotnetAddPackage", () => {
  it("formats successful add with version", () => {
    const data: DotnetAddPackageResult = {
      success: true,
      exitCode: 0,
      package: "Newtonsoft.Json",
      version: "13.0.3",
    };
    expect(formatDotnetAddPackage(data)).toContain("Newtonsoft.Json");
    expect(formatDotnetAddPackage(data)).toContain("v13.0.3");
  });
});

describe("compactAddPackageMap", () => {
  it("preserves package name and version", () => {
    const data: DotnetAddPackageResult = {
      success: true,
      exitCode: 0,
      package: "Serilog",
      version: "3.0.0",
    };
    const compact = compactAddPackageMap(data);
    expect(compact.package).toBe("Serilog");
    expect(compact.version).toBe("3.0.0");
  });
});

// ---------------------------------------------------------------------------
// list-package
// ---------------------------------------------------------------------------

describe("formatDotnetListPackage", () => {
  it("formats project listing", () => {
    const data: DotnetListPackageResult = {
      success: true,
      exitCode: 0,
      projects: [
        {
          project: "MyApp",
          frameworks: [
            {
              framework: "net8.0",
              topLevel: [{ id: "Newtonsoft.Json", resolved: "13.0.3" }],
            },
          ],
        },
      ],
    };
    const output = formatDotnetListPackage(data);
    expect(output).toContain("MyApp");
    expect(output).toContain("Newtonsoft.Json");
    expect(output).toContain("13.0.3");
  });

  it("formats empty listing", () => {
    const data: DotnetListPackageResult = { success: true, exitCode: 0, projects: [] };
    expect(formatDotnetListPackage(data)).toContain("no projects found");
  });
});

describe("compactListPackageMap + formatListPackageCompact", () => {
  it("compacts to project names and counts", () => {
    const data: DotnetListPackageResult = {
      success: true,
      exitCode: 0,
      projects: [
        {
          project: "MyApp",
          frameworks: [
            {
              framework: "net8.0",
              topLevel: [
                { id: "A", resolved: "1.0" },
                { id: "B", resolved: "2.0" },
              ],
            },
          ],
        },
      ],
    };
    const compact = compactListPackageMap(data);
    expect(compact.projects[0].packageCount).toBe(2);

    const text = formatListPackageCompact(compact);
    expect(text).toContain("MyApp (2 packages)");
  });

  it("formats compact with no projects", () => {
    const data: DotnetListPackageResult = { success: true, exitCode: 0, projects: [] };
    const compact = compactListPackageMap(data);
    const text = formatListPackageCompact(compact);
    expect(text).toContain("no projects found");
  });
});

// ── formatDotnetBuild edge cases ────────────────────────────────────

describe("formatDotnetBuild — edge cases", () => {
  it("formats build with diagnostic missing column", () => {
    const data: DotnetBuildResult = {
      success: false,
      diagnostics: [{ file: "A.cs", line: 10, severity: "error", code: "CS0001", message: "err" }],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatDotnetBuild(data);
    expect(output).toContain("A.cs(10) error CS0001: err");
  });

  it("formats build with diagnostic missing code", () => {
    const data: DotnetBuildResult = {
      success: false,
      diagnostics: [{ file: "A.cs", line: 10, column: 5, severity: "error", message: "err" }],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatDotnetBuild(data);
    expect(output).toContain("A.cs(10,5) error: err");
  });

  it("formats build with diagnostic missing message", () => {
    const data: DotnetBuildResult = {
      success: false,
      diagnostics: [{ file: "A.cs", line: 10, column: 5, severity: "warning", code: "CS0168" }],
      total: 1,
      errors: 0,
      warnings: 1,
    };
    const output = formatDotnetBuild(data);
    expect(output).toContain("A.cs(10,5) warning CS0168");
  });
});

// ── formatDotnetTest edge cases ─────────────────────────────────────

describe("formatDotnetTest — edge cases", () => {
  it("formats test without duration", () => {
    const data: DotnetTestResult = {
      success: true,
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      tests: [{ name: "Test1", status: "Passed" }],
    };
    const output = formatDotnetTest(data);
    expect(output).toContain("Passed Test1");
    expect(output).not.toContain("[");
  });
});

// ── compactTestMap edge cases ───────────────────────────────────────

describe("compactTestMap — edge cases", () => {
  it("omits failedTests when all pass", () => {
    const data: DotnetTestResult = {
      success: true,
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      tests: [{ name: "Test1", status: "Passed" }],
    };
    const compact = compactTestMap(data);
    expect(compact.failedTests).toBeUndefined();
  });
});

// ── formatTestCompact edge cases ────────────────────────────────────

describe("formatTestCompact — edge cases", () => {
  it("formats compact without failed tests", () => {
    const data: DotnetTestResult = {
      success: true,
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      tests: [
        { name: "Test1", status: "Passed" },
        { name: "Test2", status: "Passed" },
      ],
    };
    const compact = compactTestMap(data);
    const text = formatTestCompact(compact);
    expect(text).toContain("passed");
    expect(text).not.toContain("Failed:");
  });
});

// ── formatDotnetRun edge cases ──────────────────────────────────────

describe("formatDotnetRun — edge cases", () => {
  it("formats failed run (not timed out)", () => {
    const data: DotnetRunResult = { success: false, exitCode: 2, stderr: "error output" };
    const output = formatDotnetRun(data);
    expect(output).toContain("failed (exit 2)");
    expect(output).toContain("error output");
  });
});

// ── formatRunCompact edge cases ─────────────────────────────────────

describe("formatRunCompact — edge cases", () => {
  it("formats compact failed run", () => {
    const data: DotnetRunResult = { success: false, exitCode: 2 };
    const compact = compactRunMap(data);
    const text = formatRunCompact(compact);
    expect(text).toContain("failed (exit 2)");
  });
});

// ── formatDotnetPublish edge cases ──────────────────────────────────

import {
  compactPublishMap,
  formatPublishCompact,
  formatRestoreCompact,
  compactCleanMap,
  formatCleanCompact,
  formatAddPackageCompact,
} from "../src/lib/formatters.js";

describe("formatDotnetPublish — edge cases", () => {
  it("formats successful publish with warnings", () => {
    const data: DotnetPublishResult = {
      success: true,
      exitCode: 0,
      outputPath: "/publish/dir",
      warnings: ["Some warning"],
    };
    const output = formatDotnetPublish(data);
    expect(output).toContain("success");
    expect(output).toContain("1 warnings");
    expect(output).toContain("/publish/dir");
  });

  it("formats successful publish without output path", () => {
    const data: DotnetPublishResult = { success: true, exitCode: 0 };
    const output = formatDotnetPublish(data);
    expect(output).toBe("dotnet publish: success");
  });

  it("formats failed publish with errors", () => {
    const data: DotnetPublishResult = {
      success: false,
      exitCode: 1,
      errors: ["error CS1234: bad", "error CS5678: worse"],
    };
    const output = formatDotnetPublish(data);
    expect(output).toContain("failed (exit 1)");
    expect(output).toContain("error CS1234: bad");
    expect(output).toContain("error CS5678: worse");
  });

  it("formats failed publish without errors", () => {
    const data: DotnetPublishResult = { success: false, exitCode: 1 };
    const output = formatDotnetPublish(data);
    expect(output).toContain("failed (exit 1)");
  });
});

describe("compactPublishMap + formatPublishCompact", () => {
  it("formats compact successful publish with path", () => {
    const data: DotnetPublishResult = {
      success: true,
      exitCode: 0,
      outputPath: "/out",
    };
    const compact = compactPublishMap(data);
    expect(compact.outputPath).toBe("/out");
    const text = formatPublishCompact(compact);
    expect(text).toContain("success -> /out");
  });

  it("formats compact successful publish without path", () => {
    const data: DotnetPublishResult = { success: true, exitCode: 0 };
    const compact = compactPublishMap(data);
    const text = formatPublishCompact(compact);
    expect(text).toBe("dotnet publish: success");
  });

  it("formats compact failed publish", () => {
    const data: DotnetPublishResult = { success: false, exitCode: 1 };
    const compact = compactPublishMap(data);
    const text = formatPublishCompact(compact);
    expect(text).toContain("failed (exit 1)");
  });
});

// ── formatDotnetRestore edge cases ──────────────────────────────────

describe("formatDotnetRestore — edge cases", () => {
  it("formats successful restore without project count", () => {
    const data: DotnetRestoreResult = { success: true, exitCode: 0 };
    const output = formatDotnetRestore(data);
    expect(output).toBe("dotnet restore: success");
  });

  it("formats successful restore with warnings", () => {
    const data: DotnetRestoreResult = {
      success: true,
      exitCode: 0,
      restoredProjects: 1,
      warnings: ["warning NU1234: deprecated pkg"],
    };
    const output = formatDotnetRestore(data);
    expect(output).toContain("1 projects restored");
    expect(output).toContain("1 warnings");
  });

  it("formats failed restore with errors", () => {
    const data: DotnetRestoreResult = {
      success: false,
      exitCode: 1,
      errors: ["error NU1301: Unable to load"],
    };
    const output = formatDotnetRestore(data);
    expect(output).toContain("failed (exit 1)");
    expect(output).toContain("error NU1301: Unable to load");
  });

  it("formats failed restore without errors", () => {
    const data: DotnetRestoreResult = { success: false, exitCode: 1 };
    const output = formatDotnetRestore(data);
    expect(output).toContain("failed (exit 1)");
  });
});

describe("formatRestoreCompact — edge cases", () => {
  it("formats compact restore with no projects", () => {
    const data: DotnetRestoreResult = { success: true, exitCode: 0 };
    const compact = compactRestoreMap(data);
    const text = formatRestoreCompact(compact);
    expect(text).toBe("dotnet restore: success");
  });

  it("formats compact failed restore", () => {
    const data: DotnetRestoreResult = { success: false, exitCode: 1 };
    const compact = compactRestoreMap(data);
    const text = formatRestoreCompact(compact);
    expect(text).toContain("failed (exit 1)");
  });
});

// ── formatDotnetClean compact edge cases ────────────────────────────

describe("compactCleanMap + formatCleanCompact", () => {
  it("formats compact failed clean", () => {
    const data: DotnetCleanResult = { success: false, exitCode: 1 };
    const compact = compactCleanMap(data);
    const text = formatCleanCompact(compact);
    expect(text).toContain("failed (exit 1)");
  });
});

// ── formatDotnetAddPackage edge cases ───────────────────────────────

describe("formatDotnetAddPackage — edge cases", () => {
  it("formats add without version", () => {
    const data: DotnetAddPackageResult = {
      success: true,
      exitCode: 0,
      package: "SomePackage",
    };
    const output = formatDotnetAddPackage(data);
    expect(output).toContain("added SomePackage");
    expect(output).not.toContain("v");
  });

  it("formats failed add with errors", () => {
    const data: DotnetAddPackageResult = {
      success: false,
      exitCode: 1,
      package: "BadPkg",
      errors: ["error: package not found"],
    };
    const output = formatDotnetAddPackage(data);
    expect(output).toContain("failed (exit 1)");
    expect(output).toContain("error: package not found");
  });

  it("formats failed add without errors", () => {
    const data: DotnetAddPackageResult = {
      success: false,
      exitCode: 1,
      package: "BadPkg",
    };
    const output = formatDotnetAddPackage(data);
    expect(output).toContain("failed (exit 1)");
  });
});

describe("formatAddPackageCompact — edge cases", () => {
  it("formats compact success without version", () => {
    const data: DotnetAddPackageResult = {
      success: true,
      exitCode: 0,
      package: "MyPkg",
    };
    const compact = compactAddPackageMap(data);
    const text = formatAddPackageCompact(compact);
    expect(text).toContain("added MyPkg");
    expect(text).not.toContain(" v");
  });

  it("formats compact failed add", () => {
    const data: DotnetAddPackageResult = {
      success: false,
      exitCode: 1,
      package: "BadPkg",
    };
    const compact = compactAddPackageMap(data);
    const text = formatAddPackageCompact(compact);
    expect(text).toContain("failed for BadPkg");
  });
});

// ── formatDotnetListPackage edge cases ──────────────────────────────

describe("formatDotnetListPackage — edge cases", () => {
  it("formats listing with transitive packages", () => {
    const data: DotnetListPackageResult = {
      success: true,
      exitCode: 0,
      projects: [
        {
          project: "MyApp",
          frameworks: [
            {
              framework: "net8.0",
              topLevel: [{ id: "A", resolved: "1.0" }],
              transitive: [{ id: "B", resolved: "2.0", latest: "3.0" }],
            },
          ],
        },
      ],
    };
    const output = formatDotnetListPackage(data);
    expect(output).toContain("Transitive:");
    expect(output).toContain("B  2.0 -> 3.0");
  });

  it("formats listing with latest and deprecated", () => {
    const data: DotnetListPackageResult = {
      success: true,
      exitCode: 0,
      projects: [
        {
          project: "MyApp",
          frameworks: [
            {
              framework: "net8.0",
              topLevel: [{ id: "Old", resolved: "1.0", latest: "2.0", deprecated: true }],
            },
          ],
        },
      ],
    };
    const output = formatDotnetListPackage(data);
    expect(output).toContain("Old  1.0 -> 2.0 (deprecated)");
  });

  it("formats failed listing with no projects", () => {
    const data: DotnetListPackageResult = { success: false, exitCode: 1, projects: [] };
    const output = formatDotnetListPackage(data);
    expect(output).toContain("failed");
  });
});
