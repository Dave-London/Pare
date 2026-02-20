import { describe, it, expect } from "vitest";
import {
  formatRun,
  formatTest,
  formatBuild,
  formatInstall,
  formatAdd,
  formatRemove,
  formatOutdated,
  formatPmLs,
  compactRunMap,
  formatRunCompact,
  compactTestMap,
  formatTestCompact,
  compactBuildMap,
  formatBuildCompact,
  compactInstallMap,
  formatInstallCompact,
  compactAddMap,
  formatAddCompact,
  compactRemoveMap,
  formatRemoveCompact,
  compactOutdatedMap,
  formatOutdatedCompact,
  compactPmLsMap,
  formatPmLsCompact,
} from "../src/lib/formatters.js";
import type {
  BunRunResult,
  BunTestResult,
  BunBuildResult,
  BunInstallResult,
  BunAddResult,
  BunRemoveResult,
  BunOutdatedResult,
  BunPmLsResult,
} from "../src/schemas/index.js";

// ── Run ─────────────────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: BunRunResult = {
      script: "dev",
      success: true,
      exitCode: 0,
      stdout: "Server started",
      duration: 1234,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("bun run dev: success (1234ms).");
    expect(output).toContain("Server started");
  });

  it("formats failed run", () => {
    const data: BunRunResult = {
      script: "build",
      success: false,
      exitCode: 1,
      stderr: "Error: build failed",
      duration: 567,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("bun run build: exit code 1 (567ms).");
    expect(output).toContain("Error: build failed");
  });

  it("formats timed-out run", () => {
    const data: BunRunResult = {
      script: "serve",
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
  });
});

describe("compactRunMap + formatRunCompact", () => {
  it("drops stdout/stderr in compact mode", () => {
    const data: BunRunResult = {
      script: "build",
      success: true,
      exitCode: 0,
      stdout: "lots of output",
      stderr: "some warnings",
      duration: 500,
      timedOut: false,
    };
    const compact = compactRunMap(data);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
    expect(formatRunCompact(compact)).toContain("success (500ms)");
  });
});

// ── Test ────────────────────────────────────────────────────────────

describe("formatTest", () => {
  it("formats passing test suite", () => {
    const data: BunTestResult = {
      success: true,
      passed: 10,
      failed: 0,
      skipped: 0,
      total: 10,
      duration: 200,
    };
    const output = formatTest(data);
    expect(output).toContain("PASS");
    expect(output).toContain("10 passed, 0 failed, 0 skipped");
  });

  it("formats failing test suite with test details", () => {
    const data: BunTestResult = {
      success: false,
      passed: 3,
      failed: 1,
      skipped: 0,
      total: 4,
      duration: 150,
      tests: [
        { name: "test A", passed: true, duration: 1.2 },
        { name: "test B", passed: false, duration: 0.5, error: "assertion failed" },
      ],
    };
    const output = formatTest(data);
    expect(output).toContain("FAIL");
    expect(output).toContain("+ test A");
    expect(output).toContain("- test B");
    expect(output).toContain("assertion failed");
  });
});

describe("compactTestMap + formatTestCompact", () => {
  it("drops individual tests in compact mode", () => {
    const data: BunTestResult = {
      success: true,
      passed: 5,
      failed: 0,
      skipped: 1,
      total: 6,
      duration: 100,
      tests: [{ name: "a", passed: true }],
    };
    const compact = compactTestMap(data);
    expect(compact).not.toHaveProperty("tests");
    expect(formatTestCompact(compact)).toContain("5 passed");
  });
});

// ── Build ───────────────────────────────────────────────────────────

describe("formatBuild", () => {
  it("formats successful build", () => {
    const data: BunBuildResult = {
      success: true,
      entrypoints: ["src/index.ts"],
      artifacts: [{ path: "./out/index.js", size: "1.50 KB" }],
      duration: 100,
    };
    const output = formatBuild(data);
    expect(output).toContain("success");
    expect(output).toContain("src/index.ts");
    expect(output).toContain("./out/index.js");
    expect(output).toContain("1.50 KB");
  });
});

describe("compactBuildMap + formatBuildCompact", () => {
  it("shows artifact count in compact mode", () => {
    const data: BunBuildResult = {
      success: true,
      entrypoints: ["src/index.ts"],
      artifacts: [{ path: "./out/index.js", size: "1 KB" }],
      duration: 50,
    };
    const compact = compactBuildMap(data);
    expect(compact.artifactCount).toBe(1);
    expect(formatBuildCompact(compact)).toContain("1 artifacts");
  });
});

// ── Install ─────────────────────────────────────────────────────────

describe("formatInstall", () => {
  it("formats successful install", () => {
    const data: BunInstallResult = {
      success: true,
      installedCount: 128,
      duration: 1500,
    };
    const output = formatInstall(data);
    expect(output).toContain("success");
    expect(output).toContain("128 packages installed");
  });
});

describe("compactInstallMap + formatInstallCompact", () => {
  it("shows count in compact mode", () => {
    const data: BunInstallResult = { success: true, installedCount: 50, duration: 200 };
    const compact = compactInstallMap(data);
    expect(formatInstallCompact(compact)).toContain("50 packages");
  });
});

// ── Add ─────────────────────────────────────────────────────────────

describe("formatAdd", () => {
  it("formats add result", () => {
    const data: BunAddResult = {
      success: true,
      packages: ["zod", "typescript"],
      dev: false,
      duration: 300,
    };
    const output = formatAdd(data);
    expect(output).toContain("success");
    expect(output).toContain("zod, typescript");
  });

  it("shows dev label for dev deps", () => {
    const data: BunAddResult = {
      success: true,
      packages: ["vitest"],
      dev: true,
      duration: 200,
    };
    const output = formatAdd(data);
    expect(output).toContain("(dev)");
  });
});

describe("compactAddMap + formatAddCompact", () => {
  it("formats compact add", () => {
    const data: BunAddResult = {
      success: true,
      packages: ["zod"],
      dev: false,
      duration: 100,
    };
    expect(formatAddCompact(compactAddMap(data))).toContain("zod");
  });
});

// ── Remove ──────────────────────────────────────────────────────────

describe("formatRemove", () => {
  it("formats remove result", () => {
    const data: BunRemoveResult = {
      success: true,
      packages: ["zod"],
      duration: 100,
    };
    const output = formatRemove(data);
    expect(output).toContain("success");
    expect(output).toContain("zod");
  });
});

describe("compactRemoveMap + formatRemoveCompact", () => {
  it("formats compact remove", () => {
    const data: BunRemoveResult = { success: true, packages: ["zod"], duration: 50 };
    expect(formatRemoveCompact(compactRemoveMap(data))).toContain("zod");
  });
});

// ── Outdated ────────────────────────────────────────────────────────

describe("formatOutdated", () => {
  it("formats outdated packages", () => {
    const data: BunOutdatedResult = {
      success: true,
      packages: [{ name: "typescript", current: "5.3.3", latest: "5.4.0" }],
      total: 1,
      duration: 200,
    };
    const output = formatOutdated(data);
    expect(output).toContain("1 packages outdated");
    expect(output).toContain("typescript: 5.3.3 -> 5.4.0");
  });

  it("formats all up to date", () => {
    const data: BunOutdatedResult = {
      success: true,
      packages: [],
      total: 0,
      duration: 50,
    };
    const output = formatOutdated(data);
    expect(output).toContain("all packages up to date");
  });

  it("shows wanted version when different from latest", () => {
    const data: BunOutdatedResult = {
      success: true,
      packages: [{ name: "vitest", current: "1.2.0", wanted: "1.3.0", latest: "1.4.0" }],
      total: 1,
      duration: 100,
    };
    const output = formatOutdated(data);
    expect(output).toContain("(wanted: 1.3.0)");
  });
});

describe("compactOutdatedMap + formatOutdatedCompact", () => {
  it("shows count in compact mode", () => {
    const data: BunOutdatedResult = {
      success: true,
      packages: [{ name: "a", current: "1.0.0", latest: "2.0.0" }],
      total: 1,
      duration: 100,
    };
    expect(formatOutdatedCompact(compactOutdatedMap(data))).toContain("1 packages outdated");
  });

  it("handles all up to date in compact mode", () => {
    const data: BunOutdatedResult = { success: true, packages: [], total: 0, duration: 50 };
    expect(formatOutdatedCompact(compactOutdatedMap(data))).toContain("all up to date");
  });
});

// ── Pm Ls ───────────────────────────────────────────────────────────

describe("formatPmLs", () => {
  it("formats package list", () => {
    const data: BunPmLsResult = {
      success: true,
      packages: [
        { name: "typescript", version: "5.3.3" },
        { name: "zod", version: "3.22.4" },
      ],
      total: 2,
      duration: 100,
    };
    const output = formatPmLs(data);
    expect(output).toContain("2 packages");
    expect(output).toContain("typescript@5.3.3");
    expect(output).toContain("zod@3.22.4");
  });

  it("handles empty list", () => {
    const data: BunPmLsResult = { success: true, packages: [], total: 0, duration: 10 };
    const output = formatPmLs(data);
    expect(output).toContain("no packages found");
  });
});

describe("compactPmLsMap + formatPmLsCompact", () => {
  it("shows count in compact mode", () => {
    const data: BunPmLsResult = {
      success: true,
      packages: [{ name: "a", version: "1.0.0" }],
      total: 1,
      duration: 50,
    };
    expect(formatPmLsCompact(compactPmLsMap(data))).toContain("1 packages");
  });
});
