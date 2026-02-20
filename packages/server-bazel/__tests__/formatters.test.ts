import { describe, it, expect } from "vitest";
import {
  formatBazelBuild,
  formatBazelTest,
  formatBazelQuery,
  formatBazelInfo,
  formatBazelRun,
  formatBazelClean,
  formatBazelFetch,
  compactBazelBuildMap,
  formatBazelBuildCompact,
  compactBazelTestMap,
  formatBazelTestCompact,
  compactBazelQueryMap,
  formatBazelQueryCompact,
  compactBazelInfoMap,
  formatBazelInfoCompact,
  compactBazelRunMap,
  formatBazelRunCompact,
  compactBazelCleanMap,
  formatBazelCleanCompact,
  compactBazelFetchMap,
  formatBazelFetchCompact,
} from "../src/lib/formatters.js";
import type {
  BazelBuildResult,
  BazelTestResult,
  BazelQueryResult,
  BazelInfoResult,
  BazelRunResult,
  BazelCleanResult,
  BazelFetchResult,
} from "../src/schemas/index.js";

// ── Build formatters ─────────────────────────────────────────────────

describe("formatBazelBuild", () => {
  it("formats successful build", () => {
    const data: BazelBuildResult = {
      action: "build",
      success: true,
      targets: [],
      summary: { totalTargets: 2, successTargets: 2, failedTargets: 0 },
      durationMs: 5123,
      exitCode: 0,
    };
    const out = formatBazelBuild(data);
    expect(out).toContain("success");
    expect(out).toContain("5123ms");
    expect(out).toContain("2 targets");
  });

  it("formats failed build with errors", () => {
    const data: BazelBuildResult = {
      action: "build",
      success: false,
      targets: [{ label: "//src:app", status: "failed" }],
      summary: { totalTargets: 1, successTargets: 0, failedTargets: 1 },
      errors: [{ file: "/BUILD", line: 5, message: "compile error" }],
      durationMs: 3000,
      exitCode: 1,
    };
    const out = formatBazelBuild(data);
    expect(out).toContain("failed");
    expect(out).toContain("/BUILD:5");
    expect(out).toContain("compile error");
  });
});

describe("compactBazelBuild", () => {
  it("maps and formats compact build", () => {
    const data: BazelBuildResult = {
      action: "build",
      success: true,
      targets: [],
      summary: { totalTargets: 3, successTargets: 3, failedTargets: 0 },
      exitCode: 0,
    };
    const compact = compactBazelBuildMap(data);
    expect(compact.totalTargets).toBe(3);
    expect(compact.failedTargets).toBe(0);
    const text = formatBazelBuildCompact(compact);
    expect(text).toContain("success");
    expect(text).toContain("3 targets");
  });
});

// ── Test formatters ──────────────────────────────────────────────────

describe("formatBazelTest", () => {
  it("formats passing tests", () => {
    const data: BazelTestResult = {
      action: "test",
      success: true,
      tests: [{ label: "//test:unit", status: "passed", durationMs: 300 }],
      summary: { totalTests: 1, passed: 1, failed: 0, timeout: 0, flaky: 0, skipped: 0 },
      durationMs: 500,
      exitCode: 0,
    };
    const out = formatBazelTest(data);
    expect(out).toContain("ok");
    expect(out).toContain("1 passed");
    expect(out).toContain("//test:unit");
  });

  it("formats mixed results", () => {
    const data: BazelTestResult = {
      action: "test",
      success: false,
      tests: [
        { label: "//test:unit", status: "passed", durationMs: 300 },
        { label: "//test:fail", status: "failed", durationMs: 1200 },
      ],
      summary: { totalTests: 2, passed: 1, failed: 1, timeout: 0, flaky: 0, skipped: 0 },
      exitCode: 3,
    };
    const out = formatBazelTest(data);
    expect(out).toContain("FAILED");
    expect(out).toContain("1 failed");
  });
});

describe("compactBazelTest", () => {
  it("maps and formats compact test", () => {
    const data: BazelTestResult = {
      action: "test",
      success: false,
      tests: [
        { label: "//test:unit", status: "passed", durationMs: 300 },
        { label: "//test:fail", status: "failed", durationMs: 1200 },
      ],
      summary: { totalTests: 2, passed: 1, failed: 1, timeout: 0, flaky: 0, skipped: 0 },
      exitCode: 3,
    };
    const compact = compactBazelTestMap(data);
    expect(compact.failedTests).toHaveLength(1);
    expect(compact.failedTests![0].label).toBe("//test:fail");
    const text = formatBazelTestCompact(compact);
    expect(text).toContain("FAILED");
    expect(text).toContain("1 failed");
  });
});

// ── Query formatters ─────────────────────────────────────────────────

describe("formatBazelQuery", () => {
  it("formats query results", () => {
    const data: BazelQueryResult = {
      action: "query",
      success: true,
      results: ["//src:app", "//src:lib"],
      count: 2,
      exitCode: 0,
    };
    const out = formatBazelQuery(data);
    expect(out).toContain("2 results");
    expect(out).toContain("//src:app");
  });

  it("formats empty query", () => {
    const data: BazelQueryResult = {
      action: "query",
      success: true,
      results: [],
      count: 0,
      exitCode: 0,
    };
    expect(formatBazelQuery(data)).toBe("bazel query: no results.");
  });
});

describe("compactBazelQuery", () => {
  it("maps and formats compact query", () => {
    const data: BazelQueryResult = {
      action: "query",
      success: true,
      results: ["//a", "//b"],
      count: 2,
      exitCode: 0,
    };
    const compact = compactBazelQueryMap(data);
    expect(compact.count).toBe(2);
    const text = formatBazelQueryCompact(compact);
    expect(text).toContain("2 results");
  });
});

// ── Info formatters ──────────────────────────────────────────────────

describe("formatBazelInfo", () => {
  it("formats info output", () => {
    const data: BazelInfoResult = {
      action: "info",
      success: true,
      info: { workspace: "/home/user/project", "bazel-bin": "/path/to/bazel-bin" },
      exitCode: 0,
    };
    const out = formatBazelInfo(data);
    expect(out).toContain("workspace: /home/user/project");
    expect(out).toContain("bazel-bin: /path/to/bazel-bin");
  });

  it("formats empty info", () => {
    const data: BazelInfoResult = {
      action: "info",
      success: true,
      info: {},
      exitCode: 0,
    };
    expect(formatBazelInfo(data)).toBe("bazel info: no data.");
  });
});

describe("compactBazelInfo", () => {
  it("formats single key compact info", () => {
    const data: BazelInfoResult = {
      action: "info",
      success: true,
      info: { workspace: "/home/user/project" },
      exitCode: 0,
    };
    const compact = compactBazelInfoMap(data);
    const text = formatBazelInfoCompact(compact);
    expect(text).toContain("workspace=/home/user/project");
  });

  it("formats multi-key compact info", () => {
    const data: BazelInfoResult = {
      action: "info",
      success: true,
      info: { workspace: "/a", "bazel-bin": "/b" },
      exitCode: 0,
    };
    const compact = compactBazelInfoMap(data);
    const text = formatBazelInfoCompact(compact);
    expect(text).toContain("2 keys");
  });
});

// ── Run formatters ───────────────────────────────────────────────────

describe("formatBazelRun", () => {
  it("formats successful run", () => {
    const data: BazelRunResult = {
      action: "run",
      success: true,
      target: "//src:app",
      stdout: "Hello",
      exitCode: 0,
    };
    const out = formatBazelRun(data);
    expect(out).toContain("success");
    expect(out).toContain("//src:app");
    expect(out).toContain("Hello");
  });
});

describe("compactBazelRun", () => {
  it("maps and formats compact run", () => {
    const data: BazelRunResult = {
      action: "run",
      success: true,
      target: "//src:app",
      stdout: "Hello",
      exitCode: 0,
    };
    const compact = compactBazelRunMap(data);
    expect(compact.target).toBe("//src:app");
    const text = formatBazelRunCompact(compact);
    expect(text).toContain("success");
  });
});

// ── Clean formatters ─────────────────────────────────────────────────

describe("formatBazelClean", () => {
  it("formats clean success", () => {
    const data: BazelCleanResult = {
      action: "clean",
      success: true,
      expunged: false,
      exitCode: 0,
    };
    expect(formatBazelClean(data)).toBe("bazel clean: success");
  });

  it("formats clean with expunge", () => {
    const data: BazelCleanResult = {
      action: "clean",
      success: true,
      expunged: true,
      exitCode: 0,
    };
    expect(formatBazelClean(data)).toBe("bazel clean: success (expunged)");
  });
});

describe("compactBazelClean", () => {
  it("maps and formats compact clean", () => {
    const data: BazelCleanResult = {
      action: "clean",
      success: true,
      expunged: true,
      exitCode: 0,
    };
    const compact = compactBazelCleanMap(data);
    expect(compact.expunged).toBe(true);
    const text = formatBazelCleanCompact(compact);
    expect(text).toContain("success");
    expect(text).toContain("expunged");
  });
});

// ── Fetch formatters ─────────────────────────────────────────────────

describe("formatBazelFetch", () => {
  it("formats fetch success", () => {
    const data: BazelFetchResult = { action: "fetch", success: true, exitCode: 0 };
    expect(formatBazelFetch(data)).toBe("bazel fetch: success");
  });

  it("formats fetch failure", () => {
    const data: BazelFetchResult = { action: "fetch", success: false, exitCode: 1 };
    expect(formatBazelFetch(data)).toContain("failed");
  });
});

describe("compactBazelFetch", () => {
  it("maps and formats compact fetch", () => {
    const data: BazelFetchResult = { action: "fetch", success: true, exitCode: 0 };
    const compact = compactBazelFetchMap(data);
    expect(compact.exitCode).toBe(0);
    const text = formatBazelFetchCompact(compact);
    expect(text).toBe("bazel fetch: success");
  });
});
