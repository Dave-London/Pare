import { describe, it, expect } from "vitest";
import { parseTurboOutput } from "../src/lib/parsers.js";
import { formatTurbo } from "../src/lib/formatters.js";
import type { TurboResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TURBO_SUCCESS_ALL_CACHED = [
  " Tasks:    3 successful, 3 total",
  " Cached:   3 cached, 3 total",
  "  Time:    103ms >>> FULL TURBO",
  "",
  "@paretools/shared#build: cache hit, replaying logs abc123 (100ms)",
  "@paretools/git#build: cache hit, replaying logs def456 (150ms)",
  "@paretools/build#build: cache hit, replaying logs ghi789 (200ms)",
].join("\n");

const TURBO_SUCCESS_PARTIAL_CACHE = [
  "@paretools/shared#build: cache hit, replaying logs abc123 (100ms)",
  "@paretools/git#build: cache miss, executing def456 (2.5s)",
  "@paretools/build#build: cache miss, executing ghi789 (3.1s)",
  "",
  " Tasks:    3 successful, 3 total",
  " Cached:   1 cached, 3 total",
  "  Time:    5.8s",
].join("\n");

const TURBO_FAILURE = [
  "@paretools/shared#build: cache hit, replaying logs abc123 (100ms)",
  "@paretools/git#build: command exited (1)",
  "",
  " Tasks:    1 successful, 2 total",
  " Cached:   1 cached, 2 total",
  "  Time:    3.2s",
].join("\n");

const TURBO_NO_TASKS = [
  "",
  " Tasks:    0 successful, 0 total",
  " Cached:   0 cached, 0 total",
  "  Time:    50ms",
].join("\n");

const TURBO_MIXED_OUTPUT = [
  "some preamble text",
  "@paretools/shared#test: cache miss, executing abc123 (1.5s)",
  "  > vitest run",
  "  PASS tests/foo.test.ts",
  "@paretools/git#test: cache hit, replaying logs def456 (200ms)",
  "more output",
  " Tasks:    2 successful, 2 total",
  " Cached:   1 cached, 2 total",
  "  Time:    2.1s",
].join("\n");

const TURBO_ERROR_OUTPUT = [
  "@paretools/shared#build: cache miss, executing abc123 (500ms)",
  "@paretools/git#build: ERROR something went wrong",
  "",
  " Tasks:    1 successful, 2 total",
  " Cached:   0 cached, 2 total",
  "  Time:    1.5s",
].join("\n");

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseTurboOutput", () => {
  it("parses fully cached successful run", () => {
    const result = parseTurboOutput(TURBO_SUCCESS_ALL_CACHED, "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(3);
    expect(result.cached).toBe(3);
    expect(result.tasks).toHaveLength(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);

    expect(result.tasks[0]).toEqual({
      package: "@paretools/shared",
      task: "build",
      status: "pass",
      duration: "100ms",
      cache: "hit",
    });
  });

  it("parses partially cached successful run", () => {
    const result = parseTurboOutput(TURBO_SUCCESS_PARTIAL_CACHE, "", 0, 5.8);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(3);
    expect(result.cached).toBe(1);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);

    // First task is cached
    expect(result.tasks[0].cache).toBe("hit");
    expect(result.tasks[0].package).toBe("@paretools/shared");

    // Second task is a miss
    expect(result.tasks[1].cache).toBe("miss");
    expect(result.tasks[1].package).toBe("@paretools/git");
    expect(result.tasks[1].duration).toBe("2.5s");
  });

  it("parses failed run with exit code 1", () => {
    const result = parseTurboOutput(TURBO_FAILURE, "", 1, 3.2);

    expect(result.success).toBe(false);
    expect(result.totalTasks).toBe(2);
    expect(result.cached).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);

    const failedTask = result.tasks.find((t) => t.status === "fail");
    expect(failedTask).toBeDefined();
    expect(failedTask!.package).toBe("@paretools/git");
    expect(failedTask!.task).toBe("build");
  });

  it("handles empty output with no tasks", () => {
    const result = parseTurboOutput(TURBO_NO_TASKS, "", 0, 0.05);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(0);
    expect(result.tasks).toEqual([]);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
  });

  it("handles mixed output with log noise", () => {
    const result = parseTurboOutput(TURBO_MIXED_OUTPUT, "", 0, 2.1);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(2);
    expect(result.tasks).toHaveLength(2);
    expect(result.cached).toBe(1);

    expect(result.tasks[0].package).toBe("@paretools/shared");
    expect(result.tasks[0].task).toBe("test");
    expect(result.tasks[0].cache).toBe("miss");

    expect(result.tasks[1].package).toBe("@paretools/git");
    expect(result.tasks[1].task).toBe("test");
    expect(result.tasks[1].cache).toBe("hit");
  });

  it("parses ERROR task lines", () => {
    const result = parseTurboOutput(TURBO_ERROR_OUTPUT, "", 1, 1.5);

    expect(result.success).toBe(false);
    expect(result.totalTasks).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);

    const failedTask = result.tasks.find((t) => t.status === "fail");
    expect(failedTask).toBeDefined();
    expect(failedTask!.package).toBe("@paretools/git");
    expect(failedTask!.cache).toBe("miss");
  });

  it("preserves duration exactly", () => {
    const result = parseTurboOutput("", "", 0, 7.891);
    expect(result.duration).toBe(7.891);
  });

  it("handles completely empty output", () => {
    const result = parseTurboOutput("", "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.tasks).toEqual([]);
    expect(result.totalTasks).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe("formatTurbo", () => {
  it("formats successful run with cached tasks", () => {
    const data: TurboResult = {
      success: true,
      duration: 2.5,
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
    const output = formatTurbo(data);
    expect(output).toContain("turbo: 2 tasks completed in 2.5s");
    expect(output).toContain("1 cached");
    expect(output).toContain("@paretools/shared#build: pass [hit] (100ms)");
    expect(output).toContain("@paretools/git#build: pass [miss] (2.5s)");
  });

  it("formats successful run with no cached tasks", () => {
    const data: TurboResult = {
      success: true,
      duration: 5.0,
      tasks: [{ package: "web", task: "lint", status: "pass", duration: "3s", cache: "miss" }],
      totalTasks: 1,
      passed: 1,
      failed: 0,
      cached: 0,
    };
    const output = formatTurbo(data);
    expect(output).toContain("turbo: 1 tasks completed in 5s");
    expect(output).not.toContain("cached");
  });

  it("formats failed run with errors", () => {
    const data: TurboResult = {
      success: false,
      duration: 3.2,
      tasks: [
        {
          package: "@paretools/shared",
          task: "build",
          status: "pass",
          duration: "100ms",
          cache: "hit",
        },
        { package: "@paretools/git", task: "build", status: "fail", cache: "miss" },
      ],
      totalTasks: 2,
      passed: 1,
      failed: 1,
      cached: 1,
    };
    const output = formatTurbo(data);
    expect(output).toContain("turbo: failed (3.2s)");
    expect(output).toContain("1 passed");
    expect(output).toContain("1 failed");
    expect(output).toContain("@paretools/git#build: fail [miss]");
  });

  it("formats empty run with no tasks", () => {
    const data: TurboResult = {
      success: true,
      duration: 0.1,
      tasks: [],
      totalTasks: 0,
      passed: 0,
      failed: 0,
      cached: 0,
    };
    const output = formatTurbo(data);
    expect(output).toContain("turbo: 0 tasks completed in 0.1s");
  });
});
