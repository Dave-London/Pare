import { describe, it, expect } from "vitest";
import {
  parseBazelBuildOutput,
  parseBazelTestOutput,
  parseBazelQueryOutput,
  parseBazelInfoOutput,
  parseBazelRunOutput,
  parseBazelCleanOutput,
  parseBazelFetchOutput,
} from "../src/lib/parsers.js";

// ── Build ────────────────────────────────────────────────────────────

describe("parseBazelBuildOutput", () => {
  it("parses build success", () => {
    const stderr = [
      "INFO: Analyzed 2 targets (15 packages loaded, 234 targets configured).",
      "INFO: Found 2 targets...",
      "INFO: Elapsed time: 5.123s, Critical Path: 2.450s",
      "INFO: 10 processes: 4 internal, 6 linux-sandbox.",
      "INFO: Build completed successfully, 10 total actions",
    ].join("\n");
    const result = parseBazelBuildOutput("", stderr, 0);

    expect(result.action).toBe("build");
    expect(result.success).toBe(true);
    expect(result.summary.totalTargets).toBe(2);
    expect(result.summary.successTargets).toBe(2);
    expect(result.summary.failedTargets).toBe(0);
    expect(result.durationMs).toBe(5123);
    expect(result.exitCode).toBe(0);
    expect(result.errors).toBeUndefined();
  });

  it("parses build failure with errors", () => {
    const stderr = [
      "ERROR: /home/user/project/src/BUILD:5:10: Compiling src/main.cc failed: (Exit 1): gcc failed",
      "src/main.cc:10:5: error: use of undeclared identifier 'foo'",
      "ERROR: /home/user/project/src/BUILD:5:10: Target //src:app failed to build",
      "INFO: Elapsed time: 3.456s, Critical Path: 1.230s",
      "ERROR: Build did NOT complete successfully",
    ].join("\n");
    const result = parseBazelBuildOutput("", stderr, 1);

    expect(result.action).toBe("build");
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.durationMs).toBe(3456);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    // Should find the file-based error
    const fileError = result.errors!.find((e) => e.file);
    expect(fileError).toBeDefined();
    expect(fileError!.file).toBe("/home/user/project/src/BUILD");
    expect(fileError!.line).toBe(5);
  });

  it("handles empty output with nonzero exit code", () => {
    const result = parseBazelBuildOutput("", "", 1);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.summary.totalTargets).toBe(0);
  });
});

// ── Test ─────────────────────────────────────────────────────────────

describe("parseBazelTestOutput", () => {
  it("parses mixed test results (pass/fail/timeout)", () => {
    const stderr = [
      "INFO: Analyzed 3 test targets (0 packages loaded, 0 targets configured).",
      "INFO: Found 3 test targets...",
      "//test:unit_test                                                 PASSED in 0.3s",
      "  Stats over 1 runs: 1 test passed",
      "//test:integration_test                                          FAILED in 1.2s",
      "  /home/user/.cache/bazel/_bazel/test/integration_test/test.log",
      "//test:slow_test                                                 TIMEOUT in 60.0s",
      "  /home/user/.cache/bazel/_bazel/test/slow_test/test.log",
      "",
      "Executed 3 out of 3 tests: 1 test passes.",
      "INFO: Elapsed time: 62.456s, Critical Path: 60.123s",
      "INFO: Build completed, 1 test FAILED, 3 total actions",
    ].join("\n");
    const result = parseBazelTestOutput("", stderr, 3);

    expect(result.action).toBe("test");
    expect(result.success).toBe(false);
    expect(result.tests).toHaveLength(3);
    expect(result.tests[0]).toEqual({
      label: "//test:unit_test",
      status: "passed",
      durationMs: 300,
    });
    expect(result.tests[1]).toEqual({
      label: "//test:integration_test",
      status: "failed",
      durationMs: 1200,
    });
    expect(result.tests[2]).toEqual({
      label: "//test:slow_test",
      status: "timeout",
      durationMs: 60000,
    });
    expect(result.summary.totalTests).toBe(3);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.timeout).toBe(1);
    expect(result.durationMs).toBe(62456);
  });

  it("parses all passing tests", () => {
    const stderr = [
      "INFO: Analyzed 2 test targets (0 packages loaded, 0 targets configured).",
      "//test:unit_test                                                 PASSED in 0.5s",
      "//test:other_test                                                PASSED in 1.0s",
      "Executed 2 out of 2 tests: 2 test passes.",
      "INFO: Elapsed time: 2.500s, Critical Path: 1.200s",
    ].join("\n");
    const result = parseBazelTestOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.tests).toHaveLength(2);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.timeout).toBe(0);
  });

  it("handles empty test output", () => {
    const result = parseBazelTestOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.tests).toHaveLength(0);
    expect(result.summary.totalTests).toBe(0);
  });
});

// ── Query ────────────────────────────────────────────────────────────

describe("parseBazelQueryOutput", () => {
  it("parses query output (label format)", () => {
    const stdout = ["//src:app", "//src:lib", "//src:utils", "//test:unit_test"].join("\n");
    const result = parseBazelQueryOutput(stdout, "", 0);

    expect(result.action).toBe("query");
    expect(result.success).toBe(true);
    expect(result.results).toEqual(["//src:app", "//src:lib", "//src:utils", "//test:unit_test"]);
    expect(result.count).toBe(4);
  });

  it("parses empty query", () => {
    const result = parseBazelQueryOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("handles query error", () => {
    const result = parseBazelQueryOutput("", "ERROR: bad query", 1);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

// ── Info ─────────────────────────────────────────────────────────────

describe("parseBazelInfoOutput", () => {
  it("parses info output (all keys)", () => {
    const stdout = [
      "bazel-bin: /home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-bin",
      "bazel-genfiles: /home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-genfiles",
      "bazel-testlogs: /home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-testlogs",
      "execution_root: /home/user/.cache/bazel/_bazel/user/abc123/execroot/project",
      "output_base: /home/user/.cache/bazel/_bazel/user/abc123",
      "output_path: /home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-out",
      "workspace: /home/user/project",
    ].join("\n");
    const result = parseBazelInfoOutput(stdout, "", 0);

    expect(result.action).toBe("info");
    expect(result.success).toBe(true);
    expect(Object.keys(result.info)).toHaveLength(7);
    expect(result.info["workspace"]).toBe("/home/user/project");
    expect(result.info["bazel-bin"]).toBe(
      "/home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-bin",
    );
  });

  it("parses info output (single key)", () => {
    const stdout = "/home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-bin\n";
    const result = parseBazelInfoOutput(stdout, "", 0, "bazel-bin");

    expect(result.success).toBe(true);
    expect(result.info["bazel-bin"]).toBe(
      "/home/user/.cache/bazel/_bazel/user/abc123/execroot/project/bazel-bin",
    );
  });

  it("handles info error", () => {
    const result = parseBazelInfoOutput("", "ERROR: unknown key", 1);
    expect(result.success).toBe(false);
  });
});

// ── Run ──────────────────────────────────────────────────────────────

describe("parseBazelRunOutput", () => {
  it("parses successful run", () => {
    const result = parseBazelRunOutput("Hello, World!", "", 0, "//src:app");
    expect(result.action).toBe("run");
    expect(result.success).toBe(true);
    expect(result.target).toBe("//src:app");
    expect(result.stdout).toBe("Hello, World!");
    expect(result.stderr).toBeUndefined();
    expect(result.exitCode).toBe(0);
  });

  it("parses failed run", () => {
    const result = parseBazelRunOutput("", "Error: segfault", 139, "//src:app");
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(139);
    expect(result.stderr).toBe("Error: segfault");
  });
});

// ── Clean ────────────────────────────────────────────────────────────

describe("parseBazelCleanOutput", () => {
  it("parses clean success", () => {
    const result = parseBazelCleanOutput("", "INFO: Starting clean.", 0, false);
    expect(result.action).toBe("clean");
    expect(result.success).toBe(true);
    expect(result.expunged).toBe(false);
  });

  it("parses clean with expunge", () => {
    const result = parseBazelCleanOutput("", "INFO: Starting clean (--expunge).", 0, true);
    expect(result.success).toBe(true);
    expect(result.expunged).toBe(true);
  });

  it("handles clean failure", () => {
    const result = parseBazelCleanOutput("", "ERROR: clean failed", 1, false);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

// ── Fetch ────────────────────────────────────────────────────────────

describe("parseBazelFetchOutput", () => {
  it("parses fetch success", () => {
    const result = parseBazelFetchOutput("", "", 0);
    expect(result.action).toBe("fetch");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("handles fetch failure", () => {
    const result = parseBazelFetchOutput("", "ERROR: fetch failed", 1);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});
