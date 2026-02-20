import { describe, it, expect } from "vitest";
import {
  formatGradleBuild,
  formatGradleTest,
  formatGradleTasks,
  formatGradleDependencies,
  formatMavenBuild,
  formatMavenTest,
  formatMavenDependencies,
  formatMavenVerify,
  compactGradleBuildMap,
  formatGradleBuildCompact,
  compactGradleTestMap,
  formatGradleTestCompact,
  compactGradleTasksMap,
  formatGradleTasksCompact,
  compactGradleDepsMap,
  formatGradleDepsCompact,
  formatMavenBuildCompact,
  compactMavenTestMap,
  formatMavenTestCompact,
  compactMavenDepsMap,
  formatMavenDepsCompact,
  formatMavenVerifyCompact,
} from "../src/lib/formatters.js";
import type {
  GradleBuildResult,
  GradleTestResult,
  GradleTasksResult,
  GradleDependenciesResult,
  MavenBuildResult,
  MavenTestResult,
  MavenDependenciesResult,
  MavenVerifyResult,
} from "../src/schemas/index.js";

// ── Gradle build formatters ─────────────────────────────────────────

describe("formatGradleBuild", () => {
  it("formats successful build", () => {
    const data: GradleBuildResult = {
      success: true,
      exitCode: 0,
      duration: 5000,
      timedOut: false,
      tasksExecuted: 3,
    };
    const output = formatGradleBuild(data);
    expect(output).toContain("gradle build: success (5000ms).");
    expect(output).toContain("tasks executed: 3");
  });

  it("formats failed build with diagnostics", () => {
    const data: GradleBuildResult = {
      success: false,
      exitCode: 1,
      duration: 3000,
      timedOut: false,
      tasksFailed: 1,
      diagnostics: [
        { severity: "error", message: "cannot find symbol", file: "src/Main.java", line: 10 },
      ],
    };
    const output = formatGradleBuild(data);
    expect(output).toContain("gradle build: exit code 1 (3000ms).");
    expect(output).toContain("tasks failed: 1");
    expect(output).toContain("error: cannot find symbol (src/Main.java:10)");
  });

  it("formats timed out build", () => {
    const data: GradleBuildResult = {
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatGradleBuild(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
  });
});

describe("compactGradleBuildMap", () => {
  it("drops stdout/stderr, keeps summary", () => {
    const data: GradleBuildResult = {
      success: true,
      exitCode: 0,
      duration: 5000,
      timedOut: false,
      tasksExecuted: 3,
      stdout: "lots of output",
      stderr: "some warnings",
      diagnostics: [{ severity: "warning", message: "unused" }],
    };
    const compact = compactGradleBuildMap(data);
    expect(compact.success).toBe(true);
    expect(compact.diagnosticCount).toBe(1);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

describe("formatGradleBuildCompact", () => {
  it("formats successful", () => {
    expect(
      formatGradleBuildCompact({
        success: true,
        exitCode: 0,
        duration: 100,
        timedOut: false,
        diagnosticCount: 0,
      }),
    ).toBe("gradle build: success (100ms).");
  });

  it("formats failed", () => {
    expect(
      formatGradleBuildCompact({
        success: false,
        exitCode: 1,
        duration: 500,
        timedOut: false,
        diagnosticCount: 3,
      }),
    ).toBe("gradle build: exit code 1 (500ms), 3 diagnostics.");
  });

  it("formats timed out", () => {
    const output = formatGradleBuildCompact({
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
      diagnosticCount: 0,
    });
    expect(output).toContain("TIMED OUT");
  });
});

// ── Gradle test formatters ──────────────────────────────────────────

describe("formatGradleTest", () => {
  it("formats successful test run", () => {
    const data: GradleTestResult = {
      success: true,
      exitCode: 0,
      duration: 5000,
      timedOut: false,
      totalTests: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
    };
    const output = formatGradleTest(data);
    expect(output).toContain("gradle test: success (5000ms).");
    expect(output).toContain("10 tests: 10 passed, 0 failed, 0 skipped");
  });

  it("formats failed test run with details", () => {
    const data: GradleTestResult = {
      success: false,
      exitCode: 1,
      duration: 3000,
      timedOut: false,
      totalTests: 5,
      passed: 3,
      failed: 2,
      skipped: 0,
      tests: [
        { name: "testAdd", className: "MathTest", passed: true },
        { name: "testDiv", className: "MathTest", passed: false, failure: "ArithmeticException" },
      ],
    };
    const output = formatGradleTest(data);
    expect(output).toContain("5 tests: 3 passed, 2 failed, 0 skipped");
    expect(output).toContain("PASS MathTest > testAdd");
    expect(output).toContain("FAIL MathTest > testDiv");
    expect(output).toContain("ArithmeticException");
  });
});

describe("compactGradleTestMap / formatGradleTestCompact", () => {
  it("compacts and formats", () => {
    const data: GradleTestResult = {
      success: false,
      exitCode: 1,
      duration: 3000,
      timedOut: false,
      totalTests: 10,
      passed: 7,
      failed: 3,
      skipped: 0,
      tests: [{ name: "t1", passed: false }],
      stdout: "output",
    };
    const compact = compactGradleTestMap(data);
    expect(compact).not.toHaveProperty("tests");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact.totalTests).toBe(10);

    const output = formatGradleTestCompact(compact);
    expect(output).toBe("gradle test: 7/10 passed, 3 failed, 0 skipped (3000ms).");
  });

  it("formats all passed compact", () => {
    expect(
      formatGradleTestCompact({
        success: true,
        exitCode: 0,
        duration: 1000,
        timedOut: false,
        totalTests: 5,
        passed: 5,
        failed: 0,
        skipped: 0,
      }),
    ).toBe("gradle test: 5 passed (1000ms).");
  });
});

// ── Gradle tasks formatters ─────────────────────────────────────────

describe("formatGradleTasks", () => {
  it("formats empty tasks", () => {
    expect(formatGradleTasks({ tasks: [], total: 0 })).toBe("gradle: no tasks found.");
  });

  it("formats tasks with groups", () => {
    const data: GradleTasksResult = {
      tasks: [
        { name: "build", description: "Builds the project.", group: "Build" },
        { name: "clean", description: "Cleans build dir.", group: "Build" },
        { name: "help", description: "Shows help.", group: "Help" },
      ],
      total: 3,
    };
    const output = formatGradleTasks(data);
    expect(output).toContain("gradle: 3 tasks");
    expect(output).toContain("Build tasks");
    expect(output).toContain("  build - Builds the project.");
    expect(output).toContain("Help tasks");
  });
});

describe("compactGradleTasksMap / formatGradleTasksCompact", () => {
  it("compacts to total only", () => {
    const data: GradleTasksResult = {
      tasks: [{ name: "build" }, { name: "test" }],
      total: 2,
    };
    const compact = compactGradleTasksMap(data);
    expect(compact.total).toBe(2);
    expect(compact).not.toHaveProperty("tasks");
    expect(formatGradleTasksCompact(compact)).toBe("gradle: 2 tasks");
  });
});

// ── Gradle dependencies formatters ──────────────────────────────────

describe("formatGradleDependencies", () => {
  it("formats empty deps", () => {
    expect(formatGradleDependencies({ configurations: [], totalDependencies: 0 })).toBe(
      "gradle: no dependencies found.",
    );
  });

  it("formats deps with configs", () => {
    const data: GradleDependenciesResult = {
      configurations: [
        {
          configuration: "compileClasspath",
          dependencies: [{ group: "org.slf4j", artifact: "slf4j-api", version: "1.7.36" }],
        },
      ],
      totalDependencies: 1,
    };
    const output = formatGradleDependencies(data);
    expect(output).toContain("gradle: 1 dependencies");
    expect(output).toContain("compileClasspath:");
    expect(output).toContain("org.slf4j:slf4j-api:1.7.36");
  });
});

describe("compactGradleDepsMap / formatGradleDepsCompact", () => {
  it("compacts", () => {
    const compact = compactGradleDepsMap({
      configurations: [{ configuration: "a", dependencies: [{ group: "g", artifact: "a" }] }],
      totalDependencies: 1,
    });
    expect(compact.totalDependencies).toBe(1);
    expect(compact.configurationCount).toBe(1);
    expect(formatGradleDepsCompact(compact)).toBe("gradle: 1 dependencies across 1 configurations");
  });
});

// ── Maven build formatters ──────────────────────────────────────────

describe("formatMavenBuild", () => {
  it("formats successful build", () => {
    const data: MavenBuildResult = {
      success: true,
      exitCode: 0,
      duration: 2500,
      timedOut: false,
    };
    expect(formatMavenBuild(data)).toContain("maven build: success (2500ms).");
  });

  it("formats failed build", () => {
    const data: MavenBuildResult = {
      success: false,
      exitCode: 1,
      duration: 3000,
      timedOut: false,
      diagnostics: [{ severity: "error", message: "Compilation failure" }],
    };
    const output = formatMavenBuild(data);
    expect(output).toContain("exit code 1");
    expect(output).toContain("error: Compilation failure");
  });
});

describe("compactMavenBuildMap / formatMavenBuildCompact", () => {
  it("formats compact", () => {
    expect(
      formatMavenBuildCompact({
        success: true,
        exitCode: 0,
        duration: 100,
        timedOut: false,
        diagnosticCount: 0,
      }),
    ).toBe("maven build: success (100ms).");
  });
});

// ── Maven test formatters ───────────────────────────────────────────

describe("formatMavenTest", () => {
  it("formats successful test run", () => {
    const data: MavenTestResult = {
      success: true,
      exitCode: 0,
      duration: 3000,
      timedOut: false,
      totalTests: 12,
      passed: 12,
      failed: 0,
      errors: 0,
      skipped: 0,
    };
    const output = formatMavenTest(data);
    expect(output).toContain("maven test: success (3000ms).");
    expect(output).toContain("12 tests: 12 passed, 0 failed, 0 errors, 0 skipped");
  });
});

describe("compactMavenTestMap / formatMavenTestCompact", () => {
  it("formats compact", () => {
    const compact = compactMavenTestMap({
      success: false,
      exitCode: 1,
      duration: 5000,
      timedOut: false,
      totalTests: 10,
      passed: 7,
      failed: 2,
      errors: 1,
      skipped: 0,
    });
    expect(compact.totalTests).toBe(10);
    expect(formatMavenTestCompact(compact)).toBe(
      "maven test: 7/10 passed, 2 failed, 1 errors, 0 skipped (5000ms).",
    );
  });
});

// ── Maven dependencies formatters ───────────────────────────────────

describe("formatMavenDependencies", () => {
  it("formats empty deps", () => {
    expect(formatMavenDependencies({ dependencies: [], total: 0 })).toBe(
      "maven: no dependencies found.",
    );
  });

  it("formats deps", () => {
    const data: MavenDependenciesResult = {
      dependencies: [
        { groupId: "org.slf4j", artifactId: "slf4j-api", version: "1.7.36", scope: "compile" },
      ],
      total: 1,
    };
    const output = formatMavenDependencies(data);
    expect(output).toContain("maven: 1 dependencies");
    expect(output).toContain("org.slf4j:slf4j-api:1.7.36 (compile)");
  });
});

describe("compactMavenDepsMap / formatMavenDepsCompact", () => {
  it("formats compact", () => {
    const compact = compactMavenDepsMap({ dependencies: [], total: 5 });
    expect(formatMavenDepsCompact(compact)).toBe("maven: 5 dependencies");
  });

  it("formats empty compact", () => {
    expect(formatMavenDepsCompact({ total: 0 })).toBe("maven: no dependencies found.");
  });
});

// ── Maven verify formatters ─────────────────────────────────────────

describe("formatMavenVerify", () => {
  it("formats successful verify", () => {
    const data: MavenVerifyResult = {
      success: true,
      exitCode: 0,
      duration: 8000,
      timedOut: false,
    };
    expect(formatMavenVerify(data)).toContain("maven verify: success (8000ms).");
  });

  it("formats failed verify", () => {
    const data: MavenVerifyResult = {
      success: false,
      exitCode: 1,
      duration: 10000,
      timedOut: false,
      diagnostics: [{ severity: "error", message: "There are test failures" }],
    };
    const output = formatMavenVerify(data);
    expect(output).toContain("exit code 1");
    expect(output).toContain("error: There are test failures");
  });
});

describe("compactMavenVerifyMap / formatMavenVerifyCompact", () => {
  it("formats compact", () => {
    expect(
      formatMavenVerifyCompact({
        success: true,
        exitCode: 0,
        duration: 5000,
        timedOut: false,
        diagnosticCount: 0,
      }),
    ).toBe("maven verify: success (5000ms).");
  });
});
