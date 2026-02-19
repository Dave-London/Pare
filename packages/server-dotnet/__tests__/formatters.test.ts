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
  compactPublishMap,
  formatPublishCompact,
  formatDotnetRestore,
  compactRestoreMap,
  formatRestoreCompact,
  formatDotnetClean,
  compactCleanMap,
  formatCleanCompact,
  formatDotnetAddPackage,
  compactAddPackageMap,
  formatAddPackageCompact,
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
});
