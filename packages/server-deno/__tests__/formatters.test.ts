import { describe, it, expect } from "vitest";
import {
  formatTest,
  formatTestCompact,
  compactTestMap,
  formatLint,
  formatLintCompact,
  compactLintMap,
  formatFmt,
  formatCheck,
  formatTask,
  formatTaskCompact,
  compactTaskMap,
  formatRun,
  formatInfo,
  formatInfoCompact,
  compactInfoMap,
} from "../src/lib/formatters.js";
import type {
  DenoTestResult,
  DenoLintResult,
  DenoFmtResult,
  DenoCheckResult,
  DenoTaskResult,
  DenoRunResult,
  DenoInfoResult,
} from "../src/schemas/index.js";

// ── formatTest ───────────────────────────────────────────────────────

describe("formatTest", () => {
  it("formats passing test summary", () => {
    const data: DenoTestResult = {
      success: true,
      total: 3,
      passed: 3,
      failed: 0,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 15,
      tests: [
        { name: "add", status: "passed", duration: 2 },
        { name: "sub", status: "passed", duration: 1 },
        { name: "mul", status: "passed", duration: 0 },
      ],
    };
    const output = formatTest(data);
    expect(output).toContain("ok | 3 passed | 0 failed | 0 ignored (15ms)");
    expect(output).toContain("add ... passed (2ms)");
  });

  it("formats failed test summary", () => {
    const data: DenoTestResult = {
      success: false,
      total: 2,
      passed: 1,
      failed: 1,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 20,
      tests: [
        { name: "pass", status: "passed", duration: 5 },
        { name: "fail", status: "failed", duration: 3, error: "AssertionError: expected true" },
      ],
    };
    const output = formatTest(data);
    expect(output).toContain("FAILED | 1 passed | 1 failed");
    expect(output).toContain("AssertionError");
  });

  it("shows filtered count", () => {
    const data: DenoTestResult = {
      success: true,
      total: 1,
      passed: 1,
      failed: 0,
      ignored: 0,
      filtered: 5,
      measured: 0,
      duration: 10,
    };
    const output = formatTest(data);
    expect(output).toContain("5 filtered out");
  });
});

describe("formatTestCompact / compactTestMap", () => {
  it("produces compact summary", () => {
    const data: DenoTestResult = {
      success: true,
      total: 5,
      passed: 5,
      failed: 0,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 50,
      tests: [{ name: "t", status: "passed", duration: 1 }],
    };
    const compact = compactTestMap(data);
    expect(compact).not.toHaveProperty("tests");
    expect(formatTestCompact(compact)).toContain("ok | 5 passed");
  });
});

// ── formatLint ───────────────────────────────────────────────────────

describe("formatLint", () => {
  it("formats clean lint", () => {
    const data: DenoLintResult = { success: true, total: 0, errors: 0 };
    expect(formatLint(data)).toBe("deno lint: no issues found.");
  });

  it("formats lint with diagnostics", () => {
    const data: DenoLintResult = {
      success: false,
      total: 1,
      errors: 1,
      diagnostics: [
        {
          file: "src/main.ts",
          line: 5,
          column: 7,
          code: "no-unused-vars",
          message: "'x' is never used",
          hint: "Remove it",
        },
      ],
    };
    const output = formatLint(data);
    expect(output).toContain("1 errors");
    expect(output).toContain("src/main.ts:5:7 (no-unused-vars) 'x' is never used");
    expect(output).toContain("hint: Remove it");
  });
});

describe("formatLintCompact / compactLintMap", () => {
  it("produces compact lint summary", () => {
    const data: DenoLintResult = {
      success: false,
      total: 3,
      errors: 3,
      diagnostics: [{ file: "a.ts", line: 1, message: "err" }],
    };
    const compact = compactLintMap(data);
    expect(compact).not.toHaveProperty("diagnostics");
    expect(formatLintCompact(compact)).toBe("deno lint: 3 errors");
  });
});

// ── formatFmt ────────────────────────────────────────────────────────

describe("formatFmt", () => {
  it("formats check mode — all formatted", () => {
    const data: DenoFmtResult = { success: true, mode: "check", total: 0 };
    expect(formatFmt(data)).toBe("deno fmt: all files formatted.");
  });

  it("formats check mode — unformatted files", () => {
    const data: DenoFmtResult = {
      success: false,
      mode: "check",
      total: 2,
      files: ["src/a.ts", "src/b.ts"],
    };
    const output = formatFmt(data);
    expect(output).toContain("2 files need formatting");
    expect(output).toContain("src/a.ts");
  });

  it("formats write mode — no changes", () => {
    const data: DenoFmtResult = { success: true, mode: "write", total: 0 };
    expect(formatFmt(data)).toBe("deno fmt: no files changed.");
  });

  it("formats write mode — formatted files", () => {
    const data: DenoFmtResult = {
      success: true,
      mode: "write",
      total: 1,
      files: ["src/main.ts"],
    };
    expect(formatFmt(data)).toContain("formatted 1 files");
  });
});

// ── formatCheck ──────────────────────────────────────────────────────

describe("formatCheck", () => {
  it("formats clean check", () => {
    const data: DenoCheckResult = { success: true, total: 0 };
    expect(formatCheck(data)).toBe("deno check: no type errors.");
  });

  it("formats check with errors", () => {
    const data: DenoCheckResult = {
      success: false,
      total: 1,
      errors: [{ file: "main.ts", line: 5, column: 3, code: "TS2322", message: "Type mismatch" }],
    };
    const output = formatCheck(data);
    expect(output).toContain("1 type errors");
    expect(output).toContain("main.ts:5:3 TS2322: Type mismatch");
  });
});

// ── formatTask ───────────────────────────────────────────────────────

describe("formatTask", () => {
  it("formats successful task", () => {
    const data: DenoTaskResult = {
      task: "build",
      success: true,
      exitCode: 0,
      stdout: "Done",
      duration: 500,
      timedOut: false,
    };
    const output = formatTask(data);
    expect(output).toContain("deno task build: success (500ms).");
    expect(output).toContain("Done");
  });

  it("formats timed out task", () => {
    const data: DenoTaskResult = {
      task: "slow",
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    expect(formatTask(data)).toContain("TIMED OUT");
  });
});

describe("formatTaskCompact / compactTaskMap", () => {
  it("drops stdout/stderr in compact mode", () => {
    const data: DenoTaskResult = {
      task: "build",
      success: true,
      exitCode: 0,
      stdout: "lots of output",
      stderr: "some warnings",
      duration: 200,
      timedOut: false,
    };
    const compact = compactTaskMap(data);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
    expect(formatTaskCompact(compact)).toContain("success (200ms)");
  });
});

// ── formatRun ────────────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: DenoRunResult = {
      file: "main.ts",
      success: true,
      exitCode: 0,
      stdout: "Hello",
      duration: 100,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("deno run main.ts: success (100ms).");
    expect(output).toContain("Hello");
  });

  it("formats failed run", () => {
    const data: DenoRunResult = {
      file: "bad.ts",
      success: false,
      exitCode: 1,
      stderr: "error occurred",
      duration: 50,
      timedOut: false,
    };
    expect(formatRun(data)).toContain("exit code 1");
  });
});

// ── formatInfo ───────────────────────────────────────────────────────

describe("formatInfo", () => {
  it("formats successful info", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "main.ts",
      type: "TypeScript",
      totalDependencies: 3,
      totalSize: 7168,
      dependencies: [
        { specifier: "file:///main.ts", type: "local", size: 1024 },
        { specifier: "https://deno.land/std/http.ts", type: "remote", size: 4096 },
      ],
    };
    const output = formatInfo(data);
    expect(output).toContain("deno info: main.ts");
    expect(output).toContain("type: TypeScript");
    expect(output).toContain("dependencies: 3");
    expect(output).toContain("7.0KB");
    expect(output).toContain("[local]");
    expect(output).toContain("[remote]");
  });

  it("formats failed info", () => {
    const data: DenoInfoResult = { success: false, totalDependencies: 0 };
    expect(formatInfo(data)).toBe("deno info: failed to retrieve module info.");
  });
});

describe("formatInfoCompact / compactInfoMap", () => {
  it("produces compact summary", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "main.ts",
      totalDependencies: 5,
      totalSize: 10000,
      dependencies: [{ specifier: "a", type: "local" }],
    };
    const compact = compactInfoMap(data);
    expect(compact).not.toHaveProperty("dependencies");
    expect(formatInfoCompact(compact)).toContain("main.ts");
    expect(formatInfoCompact(compact)).toContain("5 dependencies");
  });
});
