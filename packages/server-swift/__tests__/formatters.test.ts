import { describe, it, expect } from "vitest";
import {
  formatBuild,
  formatTest,
  formatRun,
  formatPackageResolve,
  formatPackageUpdate,
  formatPackageShowDependencies,
  formatPackageClean,
  formatPackageInit,
  compactBuildMap,
  formatBuildCompact,
  compactTestMap,
  formatTestCompact,
  compactRunMap,
  formatRunCompact,
  compactPackageResolveMap,
  formatPackageResolveCompact,
  compactPackageUpdateMap,
  formatPackageUpdateCompact,
  compactPackageShowDependenciesMap,
  formatPackageShowDependenciesCompact,
  compactPackageCleanMap,
  formatPackageCleanCompact,
  compactPackageInitMap,
  formatPackageInitCompact,
} from "../src/lib/formatters.js";
import type {
  SwiftBuildResult,
  SwiftTestResult,
  SwiftRunResult,
  SwiftPackageResolveResult,
  SwiftPackageUpdateResult,
  SwiftPackageShowDependenciesResult,
  SwiftPackageCleanResult,
  SwiftPackageInitResult,
} from "../src/schemas/index.js";

describe("formatBuild", () => {
  it("formats successful build with no diagnostics", () => {
    const data: SwiftBuildResult = {
      success: true,
      exitCode: 0,
      errors: [],
      warnings: [],
      duration: 500,
      timedOut: false,
    };
    expect(formatBuild(data)).toBe("swift build: success (500ms)");
  });

  it("formats build with errors and warnings", () => {
    const data: SwiftBuildResult = {
      success: false,
      exitCode: 1,
      errors: [
        {
          file: "src/main.swift",
          line: 10,
          column: 5,
          severity: "error",
          message: "use of unresolved identifier",
        },
      ],
      warnings: [
        {
          file: "src/lib.swift",
          line: 20,
          column: 3,
          severity: "warning",
          message: "unused variable",
        },
      ],
      duration: 1234,
      timedOut: false,
    };
    const output = formatBuild(data);
    expect(output).toContain("swift build: failed (1 errors, 1 warnings, 1234ms)");
    expect(output).toContain("src/main.swift:10:5 error: use of unresolved identifier");
    expect(output).toContain("src/lib.swift:20:3 warning: unused variable");
  });

  it("formats timed out build", () => {
    const data: SwiftBuildResult = {
      success: false,
      exitCode: 124,
      errors: [],
      warnings: [],
      duration: 300000,
      timedOut: true,
    };
    expect(formatBuild(data)).toContain("[timed out]");
  });
});

describe("formatTest", () => {
  it("formats passing tests", () => {
    const data: SwiftTestResult = {
      success: true,
      exitCode: 0,
      passed: 3,
      failed: 0,
      skipped: 0,
      total: 3,
      testCases: [
        { name: "testAdd", status: "passed", duration: 0.001 },
        { name: "testSub", status: "passed", duration: 0.002 },
        { name: "testMul", status: "passed", duration: 0.001 },
      ],
      duration: 4,
    };
    const output = formatTest(data);
    expect(output).toContain("swift test: passed. 3 passed; 0 failed; 0 skipped (4ms)");
    expect(output).toContain("passed  testAdd (0.001s)");
  });

  it("formats failing tests", () => {
    const data: SwiftTestResult = {
      success: false,
      exitCode: 1,
      passed: 1,
      failed: 1,
      skipped: 0,
      total: 2,
      testCases: [
        { name: "testAdd", status: "passed", duration: 0.001 },
        { name: "testDiv", status: "failed", duration: 0.003 },
      ],
      duration: 4,
    };
    const output = formatTest(data);
    expect(output).toContain("swift test: FAILED. 1 passed; 1 failed; 0 skipped");
    expect(output).toContain("failed  testDiv");
  });
});

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: SwiftRunResult = {
      success: true,
      exitCode: 0,
      stdout: "Hello, World!",
      stderr: "",
      duration: 150,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("swift run: success (exit code 0, 150ms)");
    expect(output).toContain("Hello, World!");
  });

  it("formats failed run", () => {
    const data: SwiftRunResult = {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "Fatal error",
      duration: 200,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("swift run: failed (exit code 1, 200ms)");
    expect(output).toContain("Fatal error");
  });
});

describe("formatPackageResolve", () => {
  it("formats resolved packages", () => {
    const data: SwiftPackageResolveResult = {
      success: true,
      exitCode: 0,
      resolvedPackages: [
        { name: "swift-log", url: "https://github.com/apple/swift-log.git", version: "1.5.0" },
      ],
      duration: 400,
    };
    const output = formatPackageResolve(data);
    expect(output).toContain("swift package resolve: success (1 packages, 400ms)");
    expect(output).toContain("swift-log @ 1.5.0");
  });

  it("formats empty resolve", () => {
    const data: SwiftPackageResolveResult = {
      success: true,
      exitCode: 0,
      resolvedPackages: [],
      duration: 100,
    };
    expect(formatPackageResolve(data)).toBe("swift package resolve: success (100ms)");
  });
});

describe("formatPackageUpdate", () => {
  it("formats updated packages", () => {
    const data: SwiftPackageUpdateResult = {
      success: true,
      exitCode: 0,
      updatedPackages: [{ name: "swift-log", oldVersion: "1.4.0", newVersion: "1.5.0" }],
      duration: 800,
    };
    const output = formatPackageUpdate(data);
    expect(output).toContain("swift package update: success (1 packages updated, 800ms)");
    expect(output).toContain("swift-log 1.4.0 -> 1.5.0");
  });
});

describe("formatPackageShowDependencies", () => {
  it("formats dependencies", () => {
    const data: SwiftPackageShowDependenciesResult = {
      success: true,
      exitCode: 0,
      dependencies: [
        { name: "swift-log", url: "https://github.com/apple/swift-log.git", version: "1.5.0" },
      ],
    };
    const output = formatPackageShowDependencies(data);
    expect(output).toContain("1 dependencies");
    expect(output).toContain("swift-log @ 1.5.0");
  });

  it("formats no dependencies", () => {
    const data: SwiftPackageShowDependenciesResult = {
      success: true,
      exitCode: 0,
      dependencies: [],
    };
    expect(formatPackageShowDependencies(data)).toContain("no dependencies");
  });
});

describe("formatPackageClean", () => {
  it("formats successful clean", () => {
    const data: SwiftPackageCleanResult = { success: true, exitCode: 0, duration: 100 };
    expect(formatPackageClean(data)).toBe("swift package clean: success (100ms)");
  });

  it("formats failed clean", () => {
    const data: SwiftPackageCleanResult = { success: false, exitCode: 1, duration: 50 };
    expect(formatPackageClean(data)).toBe("swift package clean: failed (50ms)");
  });
});

describe("formatPackageInit", () => {
  it("formats init with created files", () => {
    const data: SwiftPackageInitResult = {
      success: true,
      exitCode: 0,
      createdFiles: ["Package.swift", "Sources/MyLib/MyLib.swift"],
      duration: 200,
    };
    const output = formatPackageInit(data);
    expect(output).toContain("swift package init: success (2 files created, 200ms)");
    expect(output).toContain("Package.swift");
  });
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactBuildMap + formatBuildCompact", () => {
  it("compacts build data", () => {
    const data: SwiftBuildResult = {
      success: true,
      exitCode: 0,
      errors: [],
      warnings: [{ file: "x.swift", line: 1, column: 1, severity: "warning", message: "unused" }],
      duration: 500,
      timedOut: false,
    };
    const compact = compactBuildMap(data);
    expect(compact.success).toBe(true);
    expect(compact.errorCount).toBe(0);
    expect(compact.warningCount).toBe(1);
    expect(compact.duration).toBe(500);

    const text = formatBuildCompact(compact);
    expect(text).toContain("swift build: success");
    expect(text).toContain("0 errors, 1 warnings");
  });
});

describe("compactTestMap + formatTestCompact", () => {
  it("compacts test data", () => {
    const data: SwiftTestResult = {
      success: false,
      exitCode: 1,
      passed: 2,
      failed: 1,
      skipped: 0,
      total: 3,
      testCases: [
        { name: "testAdd", status: "passed" },
        { name: "testSub", status: "passed" },
        { name: "testDiv", status: "failed" },
      ],
      duration: 10,
    };
    const compact = compactTestMap(data);
    expect(compact.failedTests).toEqual(["testDiv"]);

    const text = formatTestCompact(compact);
    expect(text).toContain("FAILED");
    expect(text).toContain("2 passed; 1 failed");
  });
});

describe("compactRunMap + formatRunCompact", () => {
  it("compacts run data (drops stdout/stderr)", () => {
    const data: SwiftRunResult = {
      success: true,
      exitCode: 0,
      stdout: "lots of output",
      stderr: "",
      duration: 150,
      timedOut: false,
    };
    const compact = compactRunMap(data);
    expect(compact.exitCode).toBe(0);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");

    const text = formatRunCompact(compact);
    expect(text).toContain("success");
    expect(text).toContain("150ms");
  });
});

describe("compactPackageResolveMap + formatPackageResolveCompact", () => {
  it("compacts resolve data", () => {
    const data: SwiftPackageResolveResult = {
      success: true,
      exitCode: 0,
      resolvedPackages: [{ name: "swift-log", version: "1.5.0" }],
      duration: 400,
    };
    const compact = compactPackageResolveMap(data);
    expect(compact.packageCount).toBe(1);

    const text = formatPackageResolveCompact(compact);
    expect(text).toContain("1 packages");
  });
});

describe("compactPackageUpdateMap + formatPackageUpdateCompact", () => {
  it("compacts update data", () => {
    const data: SwiftPackageUpdateResult = {
      success: true,
      exitCode: 0,
      updatedPackages: [{ name: "swift-log", oldVersion: "1.4.0", newVersion: "1.5.0" }],
      duration: 800,
    };
    const compact = compactPackageUpdateMap(data);
    expect(compact.updatedCount).toBe(1);

    const text = formatPackageUpdateCompact(compact);
    expect(text).toContain("1 updated");
  });
});

describe("compactPackageShowDependenciesMap + formatPackageShowDependenciesCompact", () => {
  it("compacts show-dependencies data", () => {
    const data: SwiftPackageShowDependenciesResult = {
      success: true,
      exitCode: 0,
      dependencies: [{ name: "swift-log" }],
    };
    const compact = compactPackageShowDependenciesMap(data);
    expect(compact.dependencyCount).toBe(1);

    const text = formatPackageShowDependenciesCompact(compact);
    expect(text).toContain("1 dependencies");
  });
});

describe("compactPackageCleanMap + formatPackageCleanCompact", () => {
  it("compacts clean data", () => {
    const data: SwiftPackageCleanResult = { success: true, exitCode: 0, duration: 100 };
    const compact = compactPackageCleanMap(data);
    expect(compact.success).toBe(true);

    const text = formatPackageCleanCompact(compact);
    expect(text).toBe("swift package clean: success (100ms)");
  });
});

describe("compactPackageInitMap + formatPackageInitCompact", () => {
  it("compacts init data", () => {
    const data: SwiftPackageInitResult = {
      success: true,
      exitCode: 0,
      createdFiles: ["Package.swift", "Sources/MyLib.swift"],
      duration: 200,
    };
    const compact = compactPackageInitMap(data);
    expect(compact.fileCount).toBe(2);

    const text = formatPackageInitCompact(compact);
    expect(text).toContain("2 files");
  });
});
