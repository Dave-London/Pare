import { describe, it, expect } from "vitest";
import {
  formatConfigure,
  formatConfigureCompact,
  compactConfigureMap,
  formatBuild,
  formatBuildCompact,
  compactBuildMap,
  formatTest,
  formatTestCompact,
  compactTestMap,
  formatPresets,
  formatPresetsCompact,
  compactPresetsMap,
  formatInstall,
  formatInstallCompact,
  compactInstallMap,
  formatClean,
  formatCleanCompact,
  compactCleanMap,
} from "../lib/formatters.js";
import type {
  CMakeConfigureResult,
  CMakeBuildResult,
  CMakeTestResult,
  CMakePresetsResult,
  CMakeInstallResult,
  CMakeCleanResult,
} from "../schemas/index.js";

// ── Configure ──────────────────────────────────────────────────────

describe("formatConfigure", () => {
  it("formats successful configure", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: true,
      generator: "GNU 11.4.0",
      buildDir: "build",
      exitCode: 0,
    };
    const output = formatConfigure(data);
    expect(output).toContain("cmake configure: success");
    expect(output).toContain("build dir: build");
    expect(output).toContain("compiler: GNU 11.4.0");
  });

  it("formats configure with errors", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: false,
      buildDir: "build",
      errors: [{ message: "FindFoo.cmake not found", file: "CMakeLists.txt", line: 3 }],
      exitCode: 1,
    };
    const output = formatConfigure(data);
    expect(output).toContain("cmake configure: failed");
    expect(output).toContain("error (CMakeLists.txt:3): FindFoo.cmake not found");
  });
});

describe("compactConfigureMap + formatConfigureCompact", () => {
  it("maps and formats compact configure", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: true,
      buildDir: "build",
      warnings: [{ message: "unused var" }],
      exitCode: 0,
    };
    const compact = compactConfigureMap(data);
    expect(compact.success).toBe(true);
    expect(compact.warningCount).toBe(1);
    expect(compact.errorCount).toBe(0);

    const output = formatConfigureCompact(compact);
    expect(output).toContain("cmake configure: success");
  });
});

// ── Build ──────────────────────────────────────────────────────────

describe("formatBuild", () => {
  it("formats successful build", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: true,
      summary: { warningCount: 0, errorCount: 0 },
      exitCode: 0,
    };
    expect(formatBuild(data)).toContain("cmake build: success");
  });

  it("formats build with warnings and errors", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: false,
      warnings: [{ message: "unused var", file: "main.cpp", line: 10, column: 5 }],
      errors: [{ message: "undeclared", file: "utils.cpp", line: 20, column: 3 }],
      summary: { warningCount: 1, errorCount: 1 },
      exitCode: 1,
    };
    const output = formatBuild(data);
    expect(output).toContain("cmake build: failed");
    expect(output).toContain("warning: main.cpp:10:5: unused var");
    expect(output).toContain("error: utils.cpp:20:3: undeclared");
  });
});

describe("compactBuildMap + formatBuildCompact", () => {
  it("maps and formats compact build", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: true,
      summary: { warningCount: 2, errorCount: 0 },
      exitCode: 0,
    };
    const compact = compactBuildMap(data);
    expect(compact.warningCount).toBe(2);
    expect(formatBuildCompact(compact)).toContain("2 warnings");
  });
});

// ── Test ───────────────────────────────────────────────────────────

describe("formatTest", () => {
  it("formats test results", () => {
    const data: CMakeTestResult = {
      action: "test",
      success: false,
      tests: [
        { name: "test_basic", number: 1, status: "passed", durationSec: 0.01 },
        { name: "test_advanced", number: 2, status: "failed", durationSec: 0.05 },
      ],
      summary: {
        totalTests: 2,
        passed: 1,
        failed: 1,
        skipped: 0,
        timeout: 0,
        totalDurationSec: 0.06,
      },
      exitCode: 8,
    };
    const output = formatTest(data);
    expect(output).toContain("ctest: 1/2 failed");
    expect(output).toContain("#1 test_basic: passed");
    expect(output).toContain("#2 test_advanced: failed");
    expect(output).toContain("total time: 0.06s");
  });
});

describe("compactTestMap + formatTestCompact", () => {
  it("maps and formats compact test", () => {
    const data: CMakeTestResult = {
      action: "test",
      success: true,
      tests: [],
      summary: { totalTests: 5, passed: 5, failed: 0, skipped: 0, timeout: 0 },
      exitCode: 0,
    };
    const compact = compactTestMap(data);
    expect(compact.totalTests).toBe(5);
    expect(formatTestCompact(compact)).toContain("5/5 passed");
  });
});

// ── Presets ────────────────────────────────────────────────────────

describe("formatPresets", () => {
  it("formats presets", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: true,
      configurePresets: [{ name: "release", displayName: "Release build" }],
      buildPresets: [{ name: "release-build" }],
      exitCode: 0,
    };
    const output = formatPresets(data);
    expect(output).toContain("cmake presets:");
    expect(output).toContain('"release" - Release build');
    expect(output).toContain('"release-build"');
  });
});

describe("compactPresetsMap + formatPresetsCompact", () => {
  it("maps and formats compact presets", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: true,
      configurePresets: [{ name: "a" }, { name: "b" }],
      exitCode: 0,
    };
    const compact = compactPresetsMap(data);
    expect(compact.configureCount).toBe(2);
    expect(compact.buildCount).toBe(0);
    expect(formatPresetsCompact(compact)).toContain("2 configure");
  });
});

// ── Install ────────────────────────────────────────────────────────

describe("formatInstall", () => {
  it("formats install output", () => {
    const data: CMakeInstallResult = {
      action: "install",
      success: true,
      prefix: "Release",
      installedFiles: ["/usr/local/lib/libfoo.a", "/usr/local/bin/foo"],
      exitCode: 0,
    };
    const output = formatInstall(data);
    expect(output).toContain("cmake install: success");
    expect(output).toContain("configuration: Release");
    expect(output).toContain("/usr/local/lib/libfoo.a");
  });
});

describe("compactInstallMap + formatInstallCompact", () => {
  it("maps and formats compact install", () => {
    const data: CMakeInstallResult = {
      action: "install",
      success: true,
      installedFiles: ["/a", "/b", "/c"],
      exitCode: 0,
    };
    const compact = compactInstallMap(data);
    expect(compact.fileCount).toBe(3);
    expect(formatInstallCompact(compact)).toContain("3 files");
  });
});

// ── Clean ──────────────────────────────────────────────────────────

describe("formatClean", () => {
  it("formats successful clean", () => {
    const data: CMakeCleanResult = { action: "clean", success: true, exitCode: 0 };
    expect(formatClean(data)).toBe("cmake clean: success");
  });

  it("formats failed clean", () => {
    const data: CMakeCleanResult = { action: "clean", success: false, exitCode: 1 };
    expect(formatClean(data)).toBe("cmake clean: failed");
  });
});

describe("compactCleanMap + formatCleanCompact", () => {
  it("maps and formats compact clean", () => {
    const data: CMakeCleanResult = { action: "clean", success: true, exitCode: 0 };
    const compact = compactCleanMap(data);
    expect(compact.success).toBe(true);
    expect(formatCleanCompact(compact)).toBe("cmake clean: success");
  });

  it("formats compact failed clean", () => {
    const data: CMakeCleanResult = { action: "clean", success: false, exitCode: 1 };
    const compact = compactCleanMap(data);
    expect(formatCleanCompact(compact)).toBe("cmake clean: failed");
  });
});

// ── formatConfigure edge cases ──────────────────────────────────────

describe("formatConfigure — edge cases", () => {
  it("formats configure without generator", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: true,
      buildDir: "build",
      exitCode: 0,
    };
    const output = formatConfigure(data);
    expect(output).toContain("cmake configure: success");
    expect(output).not.toContain("compiler:");
  });

  it("formats configure with warnings (file + line)", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: true,
      buildDir: "build",
      warnings: [
        { message: "unused var", file: "CMakeLists.txt", line: 15 },
        { message: "generic warning" },
      ],
      exitCode: 0,
    };
    const output = formatConfigure(data);
    expect(output).toContain("warning (CMakeLists.txt:15): unused var");
    expect(output).toContain("warning: generic warning");
  });

  it("formats configure with warnings having file but no line", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: true,
      buildDir: "build",
      warnings: [{ message: "something", file: "CMakeLists.txt" }],
      exitCode: 0,
    };
    const output = formatConfigure(data);
    expect(output).toContain("warning (CMakeLists.txt): something");
  });

  it("formats configure errors without file", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: false,
      buildDir: "build",
      errors: [{ message: "configuration failed" }],
      exitCode: 1,
    };
    const output = formatConfigure(data);
    expect(output).toContain("error: configuration failed");
  });

  it("formats configure errors with file but no line", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: false,
      buildDir: "build",
      errors: [{ message: "bad", file: "CMakeLists.txt" }],
      exitCode: 1,
    };
    const output = formatConfigure(data);
    expect(output).toContain("error (CMakeLists.txt): bad");
  });
});

describe("formatConfigureCompact — edge cases", () => {
  it("formats compact failed configure", () => {
    const data: CMakeConfigureResult = {
      action: "configure",
      success: false,
      buildDir: "build",
      errors: [{ message: "err" }],
      warnings: [{ message: "warn" }],
      exitCode: 1,
    };
    const compact = compactConfigureMap(data);
    const output = formatConfigureCompact(compact);
    expect(output).toContain("cmake configure: failed");
    expect(output).toContain("1 errors");
    expect(output).toContain("1 warnings");
  });
});

// ── formatBuild edge cases ──────────────────────────────────────────

describe("formatBuild — edge cases", () => {
  it("formats build warnings without file location", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: true,
      warnings: [{ message: "some warning" }],
      summary: { warningCount: 1, errorCount: 0 },
      exitCode: 0,
    };
    const output = formatBuild(data);
    expect(output).toContain("warning: unknown: some warning");
  });

  it("formats build errors without file location", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: false,
      errors: [{ message: "some error" }],
      summary: { warningCount: 0, errorCount: 1 },
      exitCode: 1,
    };
    const output = formatBuild(data);
    expect(output).toContain("error: unknown: some error");
  });

  it("formats build with null line/column", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: true,
      warnings: [{ message: "warn", file: "a.cpp" }],
      summary: { warningCount: 1, errorCount: 0 },
      exitCode: 0,
    };
    const output = formatBuild(data);
    expect(output).toContain("a.cpp:?:?");
  });
});

describe("formatBuildCompact — edge cases", () => {
  it("formats compact failed build", () => {
    const data: CMakeBuildResult = {
      action: "build",
      success: false,
      summary: { warningCount: 2, errorCount: 3 },
      exitCode: 1,
    };
    const compact = compactBuildMap(data);
    const output = formatBuildCompact(compact);
    expect(output).toContain("cmake build: failed (3 errors, 2 warnings)");
  });
});

// ── formatTest edge cases ───────────────────────────────────────────

describe("formatTest — edge cases", () => {
  it("formats test without duration", () => {
    const data: CMakeTestResult = {
      action: "test",
      success: true,
      tests: [{ name: "test1", number: 1, status: "passed" }],
      summary: { totalTests: 1, passed: 1, failed: 0, skipped: 0, timeout: 0 },
      exitCode: 0,
    };
    const output = formatTest(data);
    expect(output).toContain("#1 test1: passed");
    expect(output).not.toContain("(");
  });

  it("formats test without total duration", () => {
    const data: CMakeTestResult = {
      action: "test",
      success: true,
      tests: [],
      summary: { totalTests: 0, passed: 0, failed: 0, skipped: 0, timeout: 0 },
      exitCode: 0,
    };
    const output = formatTest(data);
    expect(output).not.toContain("total time:");
  });
});

describe("formatTestCompact — edge cases", () => {
  it("formats compact failed test", () => {
    const data: CMakeTestResult = {
      action: "test",
      success: false,
      tests: [],
      summary: { totalTests: 5, passed: 3, failed: 2, skipped: 0, timeout: 0 },
      exitCode: 8,
    };
    const compact = compactTestMap(data);
    const output = formatTestCompact(compact);
    expect(output).toContain("ctest: 2/5 failed");
  });
});

// ── formatPresets edge cases ────────────────────────────────────────

describe("formatPresets — edge cases", () => {
  it("formats failed presets", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: false,
      exitCode: 1,
    };
    const output = formatPresets(data);
    expect(output).toContain("cmake presets: failed");
  });

  it("formats presets with test presets", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: true,
      testPresets: [{ name: "tests", displayName: "All tests" }],
      exitCode: 0,
    };
    const output = formatPresets(data);
    expect(output).toContain("test:");
    expect(output).toContain('"tests" - All tests');
  });

  it("formats presets with no displayName", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: true,
      configurePresets: [{ name: "default" }],
      exitCode: 0,
    };
    const output = formatPresets(data);
    expect(output).toContain('"default"');
    expect(output).not.toContain(" - ");
  });
});

describe("formatPresetsCompact — edge cases", () => {
  it("formats compact failed presets", () => {
    const data: CMakePresetsResult = {
      action: "list-presets",
      success: false,
      exitCode: 1,
    };
    const compact = compactPresetsMap(data);
    const output = formatPresetsCompact(compact);
    expect(output).toBe("cmake presets: failed");
  });
});

// ── formatInstall edge cases ────────────────────────────────────────

describe("formatInstall — edge cases", () => {
  it("formats install without prefix", () => {
    const data: CMakeInstallResult = {
      action: "install",
      success: true,
      exitCode: 0,
    };
    const output = formatInstall(data);
    expect(output).toContain("cmake install: success");
    expect(output).not.toContain("configuration:");
  });

  it("formats failed install", () => {
    const data: CMakeInstallResult = {
      action: "install",
      success: false,
      exitCode: 1,
    };
    const output = formatInstall(data);
    expect(output).toContain("cmake install: failed");
  });
});

describe("formatInstallCompact — edge cases", () => {
  it("formats compact failed install", () => {
    const data: CMakeInstallResult = {
      action: "install",
      success: false,
      exitCode: 1,
    };
    const compact = compactInstallMap(data);
    const output = formatInstallCompact(compact);
    expect(output).toBe("cmake install: failed");
  });
});
