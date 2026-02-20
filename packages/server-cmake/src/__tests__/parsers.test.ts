import { describe, it, expect } from "vitest";
import {
  parseCMakeConfigureOutput,
  parseCMakeBuildOutput,
  parseCTestOutput,
  parseCMakePresetsOutput,
  parseCMakeInstallOutput,
  parseCMakeCleanOutput,
} from "../lib/parsers.js";

// ── Configure ──────────────────────────────────────────────────────

describe("parseCMakeConfigureOutput", () => {
  it("parses successful configure output", () => {
    const stdout = [
      "-- The C compiler identification is GNU 11.4.0",
      "-- The CXX compiler identification is GNU 11.4.0",
      "-- Detecting C compiler ABI info",
      "-- Detecting C compiler ABI info - done",
      "-- Check for working C compiler: /usr/bin/cc - skipped",
      "-- Detecting CXX compiler ABI info",
      "-- Detecting CXX compiler ABI info - done",
      "-- Configuring done (0.5s)",
      "-- Generating done (0.1s)",
      "-- Build files have been written to: /home/user/project/build",
    ].join("\n");

    const result = parseCMakeConfigureOutput(stdout, "", 0, "build");

    expect(result.action).toBe("configure");
    expect(result.success).toBe(true);
    expect(result.generator).toBe("GNU 11.4.0");
    expect(result.buildDir).toBe("build");
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
    expect(result.exitCode).toBe(0);
  });

  it("parses configure with warnings", () => {
    const stdout = [
      "CMake Warning at CMakeLists.txt:15:",
      "  Manually-specified variables were not used by the project:",
      "",
      "    UNUSED_VAR",
      "",
      "-- Configuring done (0.3s)",
      "-- Generating done (0.1s)",
    ].join("\n");

    const result = parseCMakeConfigureOutput(stdout, "", 0, "build");

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings![0].file).toBe("CMakeLists.txt");
    expect(result.warnings![0].line).toBe(15);
  });

  it("parses configure with errors", () => {
    const stderr = [
      "CMake Error at CMakeLists.txt:3 (find_package):",
      '  By not providing "FindFoo.cmake" in CMAKE_MODULE_PATH this project has',
      '  asked CMake to find a package configuration file provided by "Foo", but',
      "  CMake did not find one.",
      "",
      "-- Configuring incomplete, errors occurred!",
    ].join("\n");

    const result = parseCMakeConfigureOutput("", stderr, 1, "build");

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThanOrEqual(1);
    expect(result.errors![0].file).toBe("CMakeLists.txt");
    expect(result.errors![0].line).toBe(3);
    expect(result.exitCode).toBe(1);
  });

  it("handles empty output", () => {
    const result = parseCMakeConfigureOutput("", "", 1, "build");

    expect(result.success).toBe(false);
    expect(result.generator).toBeUndefined();
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
  });
});

// ── Build ──────────────────────────────────────────────────────────

describe("parseCMakeBuildOutput", () => {
  it("parses build with GCC warnings and errors", () => {
    const stdout = [
      "[1/4] Building CXX object CMakeFiles/app.dir/src/main.cpp.o",
      "/home/user/project/src/main.cpp:10:5: warning: unused variable 'x' [-Wunused-variable]",
      "   10 |     int x = 5;",
      "      |     ^",
      "[2/4] Building CXX object CMakeFiles/app.dir/src/utils.cpp.o",
      "/home/user/project/src/utils.cpp:20:3: error: use of undeclared identifier 'foo'",
      "   20 |   foo();",
      "      |   ^",
    ].join("\n");

    const result = parseCMakeBuildOutput(stdout, "", 1);

    expect(result.action).toBe("build");
    expect(result.success).toBe(false);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0]).toEqual({
      message: "unused variable 'x' [-Wunused-variable]",
      file: "/home/user/project/src/main.cpp",
      line: 10,
      column: 5,
    });
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0]).toEqual({
      message: "use of undeclared identifier 'foo'",
      file: "/home/user/project/src/utils.cpp",
      line: 20,
      column: 3,
    });
    expect(result.summary).toEqual({ warningCount: 1, errorCount: 1 });
  });

  it("parses successful build with no warnings or errors", () => {
    const stdout = [
      "[1/2] Building CXX object CMakeFiles/app.dir/src/main.cpp.o",
      "[2/2] Linking CXX executable app",
    ].join("\n");

    const result = parseCMakeBuildOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
    expect(result.summary).toEqual({ warningCount: 0, errorCount: 0 });
  });

  it("parses MSVC warnings and errors", () => {
    const stdout = [
      "main.cpp(10): warning C4101: 'x': unreferenced local variable",
      "utils.cpp(20): error C2065: 'foo': undeclared identifier",
    ].join("\n");

    const result = parseCMakeBuildOutput(stdout, "", 1);

    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].file).toBe("main.cpp");
    expect(result.warnings![0].line).toBe(10);
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].file).toBe("utils.cpp");
    expect(result.errors![0].line).toBe(20);
  });

  it("handles empty output", () => {
    const result = parseCMakeBuildOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
    expect(result.summary).toEqual({ warningCount: 0, errorCount: 0 });
  });
});

// ── CTest ──────────────────────────────────────────────────────────

describe("parseCTestOutput", () => {
  it("parses ctest with mixed results", () => {
    const stdout = [
      "Test project /home/user/project/build",
      "    Start 1: test_basic",
      "1/3 Test #1: test_basic ...................   Passed    0.01 sec",
      "    Start 2: test_advanced",
      "2/3 Test #2: test_advanced ................***Failed    0.05 sec",
      "    Start 3: test_edge",
      "3/3 Test #3: test_edge ....................   Passed    0.02 sec",
      "",
      "67% tests passed, 1 tests failed out of 3",
      "",
      "Total Test time (real) =   0.08 sec",
      "",
      "The following tests FAILED:",
      "          2 - test_advanced (Failed)",
    ].join("\n");

    const result = parseCTestOutput(stdout, "", 8);

    expect(result.action).toBe("test");
    expect(result.success).toBe(false);
    expect(result.tests).toHaveLength(3);
    expect(result.tests[0]).toEqual({
      name: "test_basic",
      number: 1,
      status: "passed",
      durationSec: 0.01,
    });
    expect(result.tests[1]).toEqual({
      name: "test_advanced",
      number: 2,
      status: "failed",
      durationSec: 0.05,
    });
    expect(result.tests[2]).toEqual({
      name: "test_edge",
      number: 3,
      status: "passed",
      durationSec: 0.02,
    });
    expect(result.summary).toEqual({
      totalTests: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      timeout: 0,
      totalDurationSec: 0.08,
    });
  });

  it("parses ctest all passing", () => {
    const stdout = [
      "Test project /home/user/project/build",
      "    Start 1: test_one",
      "1/2 Test #1: test_one .....................   Passed    0.01 sec",
      "    Start 2: test_two",
      "2/2 Test #2: test_two .....................   Passed    0.02 sec",
      "",
      "100% tests passed, 0 tests failed out of 2",
      "",
      "Total Test time (real) =   0.03 sec",
    ].join("\n");

    const result = parseCTestOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.tests).toHaveLength(2);
    expect(result.summary.totalTests).toBe(2);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.totalDurationSec).toBe(0.03);
  });

  it("handles empty ctest output", () => {
    const result = parseCTestOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.tests).toHaveLength(0);
    expect(result.summary.totalTests).toBe(0);
  });
});

// ── Presets ────────────────────────────────────────────────────────

describe("parseCMakePresetsOutput", () => {
  it("parses presets output", () => {
    const stdout = [
      "Available configure presets:",
      "",
      '  "release" - Release build',
      '  "debug"   - Debug build',
      "",
      "Available build presets:",
      "",
      '  "release-build" - Release build preset',
    ].join("\n");

    const result = parseCMakePresetsOutput(stdout, "", 0);

    expect(result.action).toBe("list-presets");
    expect(result.success).toBe(true);
    expect(result.configurePresets).toEqual([
      { name: "release", displayName: "Release build" },
      { name: "debug", displayName: "Debug build" },
    ]);
    expect(result.buildPresets).toEqual([
      { name: "release-build", displayName: "Release build preset" },
    ]);
    expect(result.testPresets).toBeUndefined();
  });

  it("handles empty presets output", () => {
    const result = parseCMakePresetsOutput("", "", 1);

    expect(result.success).toBe(false);
    expect(result.configurePresets).toBeUndefined();
    expect(result.buildPresets).toBeUndefined();
    expect(result.testPresets).toBeUndefined();
  });
});

// ── Install ────────────────────────────────────────────────────────

describe("parseCMakeInstallOutput", () => {
  it("parses install output", () => {
    const stdout = [
      '-- Install configuration: "Release"',
      "-- Installing: /usr/local/lib/libfoo.a",
      "-- Installing: /usr/local/include/foo.h",
      "-- Installing: /usr/local/bin/foo",
    ].join("\n");

    const result = parseCMakeInstallOutput(stdout, "", 0);

    expect(result.action).toBe("install");
    expect(result.success).toBe(true);
    expect(result.prefix).toBe("Release");
    expect(result.installedFiles).toEqual([
      "/usr/local/lib/libfoo.a",
      "/usr/local/include/foo.h",
      "/usr/local/bin/foo",
    ]);
  });

  it("handles empty install output", () => {
    const result = parseCMakeInstallOutput("", "", 1);

    expect(result.success).toBe(false);
    expect(result.prefix).toBeUndefined();
    expect(result.installedFiles).toBeUndefined();
  });
});

// ── Clean ──────────────────────────────────────────────────────────

describe("parseCMakeCleanOutput", () => {
  it("parses successful clean", () => {
    const result = parseCMakeCleanOutput("", "", 0);

    expect(result.action).toBe("clean");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("parses failed clean", () => {
    const result = parseCMakeCleanOutput("", "Error: no build directory", 1);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});
