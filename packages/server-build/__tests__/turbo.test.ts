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
      durationMs: 100,
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
    expect(result.tasks[0].durationMs).toBe(100);

    // Second task is a miss
    expect(result.tasks[1].cache).toBe("miss");
    expect(result.tasks[1].package).toBe("@paretools/git");
    expect(result.tasks[1].duration).toBe("2.5s");
    expect(result.tasks[1].durationMs).toBe(2500);

    // Third task
    expect(result.tasks[2].duration).toBe("3.1s");
    expect(result.tasks[2].durationMs).toBe(3100);
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
    expect(result.tasks[0].durationMs).toBe(1500);

    expect(result.tasks[1].package).toBe("@paretools/git");
    expect(result.tasks[1].task).toBe("test");
    expect(result.tasks[1].cache).toBe("hit");
    expect(result.tasks[1].durationMs).toBe(200);
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
// Modern turbo 2.x output format (regression coverage for #830)
// ---------------------------------------------------------------------------

// Real captured output from `turbo 2.9.6` for the repro in #830.
// Note: per-task lines use ":" between package and task (not "#"), and the
// status line does NOT include a trailing "(duration)" suffix.
const TURBO_V2_FORCE_BUILD = [
  "",
  "   • Packages in scope: @paretools/shared",
  "   • Running build in 1 packages",
  "   • Remote caching disabled, using shared worktree cache",
  "",
  "@paretools/shared:build: cache bypass, force executing 678fee9a6acfc093",
  "@paretools/shared:build: ",
  "@paretools/shared:build: > @paretools/shared@0.18.0 build /tmp/pkg/shared",
  "@paretools/shared:build: > tsc",
  "@paretools/shared:build: ",
  "",
  " Tasks:    1 successful, 1 total",
  "Cached:    0 cached, 1 total",
  "  Time:    1.262s",
].join("\n");

const TURBO_V2_CACHE_HIT = [
  "@paretools/shared:build: cache hit, replaying logs 678fee9a6acfc093",
  "@paretools/shared:build: ",
  "@paretools/shared:build: > tsc",
  "",
  " Tasks:    1 successful, 1 total",
  "Cached:    1 cached, 1 total",
  "  Time:    59ms >>> FULL TURBO",
].join("\n");

const TURBO_V2_CACHE_MISS = [
  "@paretools/shared:build: cache miss, executing 678fee9a6acfc093",
  "@paretools/shared:build: > tsc",
  "",
  " Tasks:    1 successful, 1 total",
  "Cached:    0 cached, 1 total",
  "  Time:    1.5s",
].join("\n");

// Real captured output for a failing build under turbo 2.x: the task status
// line uses ":" but the failure summary lines still use "#".
const TURBO_V2_FAILURE = [
  "@paretools/shared:build: cache bypass, force executing 5a7ec1ce892dbcf0",
  "@paretools/shared:build: > tsc",
  "@paretools/shared:build: src/break.ts(1,6): error TS1005: ';' expected.",
  "@paretools/shared:build:  ELIFECYCLE  Command failed with exit code 2.",
  " ERROR  @paretools/shared#build: command (/tmp/pkg/shared) /usr/local/bin/pnpm run build exited (2)",
  "",
  " Tasks:    0 successful, 1 total",
  "Cached:    0 cached, 1 total",
  "  Time:    1.393s ",
  "Failed:    @paretools/shared#build",
  "",
  " ERROR  run failed: command  exited (2)",
].join("\n");

describe("parseTurboOutput (turbo 2.x)", () => {
  it("parses a force-rebuilt single task (cache bypass) and reports passed=1", () => {
    const result = parseTurboOutput(TURBO_V2_FORCE_BUILD, "", 0, 1.3);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks?.[0]).toMatchObject({
      package: "@paretools/shared",
      task: "build",
      status: "pass",
      cache: "miss",
    });
  });

  it("parses a cache hit and reports cached=1", () => {
    const result = parseTurboOutput(TURBO_V2_CACHE_HIT, "", 0, 0.06);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(1);
    expect(result.tasks?.[0]).toMatchObject({
      package: "@paretools/shared",
      task: "build",
      status: "pass",
      cache: "hit",
    });
  });

  it("parses a cache miss task with no inline duration", () => {
    const result = parseTurboOutput(TURBO_V2_CACHE_MISS, "", 0, 1.5);

    expect(result.success).toBe(true);
    expect(result.totalTasks).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.cached).toBe(0);
    expect(result.tasks?.[0]).toMatchObject({
      package: "@paretools/shared",
      task: "build",
      status: "pass",
      cache: "miss",
    });
  });

  it("parses a failing build using ERROR + Failed lines (turbo 2.x)", () => {
    const result = parseTurboOutput(TURBO_V2_FAILURE, "", 1, 1.4);

    expect(result.success).toBe(false);
    expect(result.totalTasks).toBe(1);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks?.[0]).toMatchObject({
      package: "@paretools/shared",
      task: "build",
      status: "fail",
    });
  });

  it("preserves the passed + failed === totalTasks invariant across all fixtures", () => {
    const fixtures = [
      { stdout: TURBO_SUCCESS_ALL_CACHED, exit: 0 },
      { stdout: TURBO_SUCCESS_PARTIAL_CACHE, exit: 0 },
      { stdout: TURBO_FAILURE, exit: 1 },
      { stdout: TURBO_NO_TASKS, exit: 0 },
      { stdout: TURBO_MIXED_OUTPUT, exit: 0 },
      { stdout: TURBO_ERROR_OUTPUT, exit: 1 },
      { stdout: TURBO_V2_FORCE_BUILD, exit: 0 },
      { stdout: TURBO_V2_CACHE_HIT, exit: 0 },
      { stdout: TURBO_V2_CACHE_MISS, exit: 0 },
      { stdout: TURBO_V2_FAILURE, exit: 1 },
    ];
    for (const f of fixtures) {
      const result = parseTurboOutput(f.stdout, "", f.exit, 0);
      expect(
        result.passed + result.failed,
        `passed(${result.passed}) + failed(${result.failed}) must equal totalTasks(${result.totalTasks}) for fixture: ${f.stdout.split("\n")[0] || "<empty>"}`,
      ).toBe(result.totalTasks);
      expect(result.cached).toBeLessThanOrEqual(result.totalTasks);
    }
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
          durationMs: 100,
          cache: "hit",
        },
        {
          package: "@paretools/git",
          task: "build",
          status: "pass",
          duration: "2.5s",
          durationMs: 2500,
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
    expect(output).toContain("[100ms]");
    expect(output).toContain("@paretools/git#build: pass [miss] (2.5s)");
    expect(output).toContain("[2500ms]");
  });

  it("formats successful run with no cached tasks", () => {
    const data: TurboResult = {
      success: true,
      duration: 5.0,
      tasks: [
        {
          package: "web",
          task: "lint",
          status: "pass",
          duration: "3s",
          durationMs: 3000,
          cache: "miss",
        },
      ],
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
          durationMs: 100,
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
