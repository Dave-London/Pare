import { describe, it, expect } from "vitest";
import { parseNxOutput } from "../src/lib/parsers.js";
import { formatNx, compactNxMap, formatNxCompact } from "../src/lib/formatters.js";
import type { NxResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NX_SUCCESS_OUTPUT = [
  "   ✔  nx run app:build [local cache]                              (1.2s)",
  "   ✔  nx run lib:build                                            (3.4s)",
  "   ✔  nx run shared:build [local cache]                           (0.8s)",
  "",
  " ——————————————————————————————————————————————————————————————————",
  "",
  " >  NX   Successfully ran target build for 3 projects (5.4s)",
].join("\n");

const NX_FAILURE_OUTPUT = [
  "   ✔  nx run lib:build [local cache]                              (0.5s)",
  "   ✖  nx run app:build                                            (2.1s)",
  "",
  " ——————————————————————————————————————————————————————————————————",
  "",
  " >  NX   Ran target build for 2 projects (2.6s)",
  "",
  "   Failed tasks:",
  "   - nx run app:build",
].join("\n");

const NX_ALL_CACHED = [
  "   ✔  nx run app:build [local cache]                              (0.1s)",
  "   ✔  nx run lib:build [remote cache]                             (0.2s)",
  "   ✔  nx run shared:build [local cache]                           (0.1s)",
  "",
  " >  NX   Successfully ran target build for 3 projects (0.4s)",
].join("\n");

const NX_SINGLE_PROJECT = [
  "   ✔  nx run my-app:test                                          (5.0s)",
  "",
  " >  NX   Successfully ran target test for 1 project (5.0s)",
].join("\n");

const NX_EMPTY_OUTPUT = "";

const NX_NO_TASKS_OUTPUT = ["", " >  NX   No projects with target build were run", ""].join("\n");

const NX_MIXED_STATUSES = [
  "   ✔  nx run @scope/pkg-a:lint [local cache]                      (0.3s)",
  "   ✖  nx run @scope/pkg-b:lint                                    (1.5s)",
  "   ✔  nx run @scope/pkg-c:lint                                    (0.9s)",
  "   ✖  nx run @scope/pkg-d:lint                                    (0.7s)",
].join("\n");

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseNxOutput", () => {
  it("parses successful multi-project build with cache hits", () => {
    const result = parseNxOutput(NX_SUCCESS_OUTPUT, "", 0, 5.4);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(5.4);
    expect(result.tasks).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(2);

    expect(result.tasks[0]).toEqual({
      project: "app",
      target: "build",
      status: "success",
      duration: 1.2,
      cache: true,
    });
    expect(result.tasks[1]).toEqual({
      project: "lib",
      target: "build",
      status: "success",
      duration: 3.4,
      cache: undefined,
    });
  });

  it("parses output with failures", () => {
    const result = parseNxOutput(NX_FAILURE_OUTPUT, "", 1, 2.6);

    expect(result.success).toBe(false);
    expect(result.tasks).toHaveLength(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.cached).toBe(1);

    expect(result.tasks[0].status).toBe("success");
    expect(result.tasks[0].cache).toBe(true);
    expect(result.tasks[1].status).toBe("failure");
    expect(result.tasks[1].project).toBe("app");
  });

  it("parses all-cached output", () => {
    const result = parseNxOutput(NX_ALL_CACHED, "", 0, 0.4);

    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(3);
    expect(result.cached).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
  });

  it("parses single project output", () => {
    const result = parseNxOutput(NX_SINGLE_PROJECT, "", 0, 5.0);

    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].project).toBe("my-app");
    expect(result.tasks[0].target).toBe("test");
    expect(result.tasks[0].duration).toBe(5.0);
    expect(result.tasks[0].cache).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseNxOutput(NX_EMPTY_OUTPUT, "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.tasks).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
  });

  it("handles output with no tasks", () => {
    const result = parseNxOutput(NX_NO_TASKS_OUTPUT, "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.tasks).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("parses scoped package names", () => {
    const result = parseNxOutput(NX_MIXED_STATUSES, "", 1, 3.4);

    expect(result.success).toBe(false);
    expect(result.tasks).toHaveLength(4);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.cached).toBe(1);

    expect(result.tasks[0].project).toBe("@scope/pkg-a");
    expect(result.tasks[1].project).toBe("@scope/pkg-b");
    expect(result.tasks[1].status).toBe("failure");
  });

  it("preserves duration exactly", () => {
    const result = parseNxOutput(NX_EMPTY_OUTPUT, "", 0, 7.89);
    expect(result.duration).toBe(7.89);
  });

  it("uses stderr when stdout is empty", () => {
    const result = parseNxOutput("", NX_SUCCESS_OUTPUT, 0, 5.4);

    expect(result.tasks).toHaveLength(3);
    expect(result.passed).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe("formatNx", () => {
  it("formats successful build with tasks", () => {
    const data: NxResult = {
      success: true,
      duration: 5.4,
      tasks: [
        { project: "app", target: "build", status: "success", duration: 1.2, cache: true },
        { project: "lib", target: "build", status: "success", duration: 3.4 },
      ],
      total: 2,
      passed: 2,
      failed: 0,
      cached: 1,
    };
    const output = formatNx(data);
    expect(output).toContain("nx: 2 passed, 0 failed, 1 cached (5.4s)");
    expect(output).toContain("✔ app:build [cache] (1.2s)");
    expect(output).toContain("✔ lib:build (3.4s)");
  });

  it("formats failed build with tasks", () => {
    const data: NxResult = {
      success: false,
      duration: 2.6,
      tasks: [
        { project: "lib", target: "build", status: "success", duration: 0.5, cache: true },
        { project: "app", target: "build", status: "failure", duration: 2.1 },
      ],
      total: 2,
      passed: 1,
      failed: 1,
      cached: 1,
    };
    const output = formatNx(data);
    expect(output).toContain("1 passed, 1 failed, 1 cached");
    expect(output).toContain("✖ app:build (2.1s)");
  });

  it("formats empty result", () => {
    const data: NxResult = {
      success: true,
      duration: 0.1,
      tasks: [],
      total: 0,
      passed: 0,
      failed: 0,
      cached: 0,
    };
    const output = formatNx(data);
    expect(output).toBe("nx: 0 passed, 0 failed, 0 cached (0.1s)");
  });

  it("formats tasks without duration", () => {
    const data: NxResult = {
      success: true,
      duration: 1.0,
      tasks: [{ project: "app", target: "build", status: "success" }],
      total: 1,
      passed: 1,
      failed: 0,
      cached: 0,
    };
    const output = formatNx(data);
    expect(output).toContain("✔ app:build");
    expect(output).not.toContain("(undefined");
  });
});

// ---------------------------------------------------------------------------
// Compact formatter tests
// ---------------------------------------------------------------------------

describe("compactNxMap", () => {
  it("strips tasks array from full result", () => {
    const data: NxResult = {
      success: true,
      duration: 5.4,
      tasks: [{ project: "app", target: "build", status: "success", duration: 1.2, cache: true }],
      total: 1,
      passed: 1,
      failed: 0,
      cached: 1,
    };
    const compact = compactNxMap(data);
    expect(compact.success).toBe(true);
    expect(compact.duration).toBe(5.4);
    expect(compact.total).toBe(1);
    expect(compact.passed).toBe(1);
    expect(compact.failed).toBe(0);
    expect(compact.cached).toBe(1);
    expect((compact as Record<string, unknown>).tasks).toBeUndefined();
  });
});

describe("formatNxCompact", () => {
  it("formats successful compact result", () => {
    const output = formatNxCompact({
      success: true,
      duration: 5.4,
      total: 3,
      passed: 3,
      failed: 0,
      cached: 2,
    });
    expect(output).toBe("nx: 3 passed, 0 failed, 2 cached (5.4s)");
  });

  it("formats failed compact result", () => {
    const output = formatNxCompact({
      success: false,
      duration: 2.6,
      total: 2,
      passed: 1,
      failed: 1,
      cached: 0,
    });
    expect(output).toContain("nx: failed");
    expect(output).toContain("1 passed, 1 failed, 0 cached");
  });
});
