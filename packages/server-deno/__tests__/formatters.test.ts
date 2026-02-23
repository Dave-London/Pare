import { describe, it, expect } from "vitest";
import {
  formatTest,
  formatTestCompact,
  compactTestMap,
  formatLint,
  formatLintCompact,
  compactLintMap,
  formatFmt,
  formatFmtCompact,
  compactFmtMap,
  formatCheck,
  formatCheckCompact,
  compactCheckMap,
  formatTask,
  formatTaskCompact,
  compactTaskMap,
  formatRun,
  formatRunCompact,
  compactRunMap,
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

  it("formats failed info compact", () => {
    const data: DenoInfoResult = { success: false, totalDependencies: 0 };
    const compact = compactInfoMap(data);
    expect(formatInfoCompact(compact)).toBe("deno info: failed.");
  });

  it("formats compact with undefined module", () => {
    const data: DenoInfoResult = { success: true, totalDependencies: 3 };
    const compact = compactInfoMap(data);
    expect(formatInfoCompact(compact)).toContain("unknown");
    expect(formatInfoCompact(compact)).toContain("3 dependencies");
  });
});

// ── Additional branch coverage tests ────────────────────────────────

describe("formatTest — edge cases", () => {
  it("shows measured count", () => {
    const data: DenoTestResult = {
      success: true,
      total: 2,
      passed: 2,
      failed: 0,
      ignored: 0,
      filtered: 0,
      measured: 3,
      duration: 50,
    };
    const output = formatTest(data);
    expect(output).toContain("3 measured");
  });

  it("handles test without duration", () => {
    const data: DenoTestResult = {
      success: true,
      total: 1,
      passed: 1,
      failed: 0,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 10,
      tests: [{ name: "no-dur", status: "passed" }],
    };
    const output = formatTest(data);
    expect(output).toContain("no-dur ... passed");
    expect(output).not.toContain("(undefined");
  });

  it("handles tests undefined (no test details)", () => {
    const data: DenoTestResult = {
      success: true,
      total: 0,
      passed: 0,
      failed: 0,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 5,
    };
    const output = formatTest(data);
    expect(output).toContain("ok | 0 passed");
  });
});

describe("formatLint — edge cases", () => {
  it("formats diagnostic without column", () => {
    const data: DenoLintResult = {
      success: false,
      total: 1,
      errors: 1,
      diagnostics: [{ file: "src/a.ts", line: 10, message: "bad code" }],
    };
    const output = formatLint(data);
    expect(output).toContain("src/a.ts:10 bad code");
  });

  it("formats diagnostic without code", () => {
    const data: DenoLintResult = {
      success: false,
      total: 1,
      errors: 1,
      diagnostics: [{ file: "b.ts", line: 3, column: 5, message: "error msg" }],
    };
    const output = formatLint(data);
    expect(output).toContain("b.ts:3:5 error msg");
    expect(output).not.toContain("(");
  });

  it("formats diagnostics undefined (empty array)", () => {
    const data: DenoLintResult = {
      success: false,
      total: 1,
      errors: 1,
    };
    const output = formatLint(data);
    expect(output).toContain("1 errors");
  });
});

describe("formatFmt — edge cases", () => {
  it("formats check mode with undefined files", () => {
    const data: DenoFmtResult = { success: false, mode: "check", total: 3 };
    const output = formatFmt(data);
    expect(output).toContain("3 files need formatting");
  });

  it("formats write mode with undefined files", () => {
    const data: DenoFmtResult = { success: true, mode: "write", total: 2 };
    const output = formatFmt(data);
    expect(output).toContain("formatted 2 files");
  });
});

describe("formatCheck — edge cases", () => {
  it("formats error without column", () => {
    const data: DenoCheckResult = {
      success: false,
      total: 1,
      errors: [{ file: "a.ts", line: 5, message: "type error" }],
    };
    const output = formatCheck(data);
    expect(output).toContain("a.ts:5 type error");
  });

  it("formats error without code", () => {
    const data: DenoCheckResult = {
      success: false,
      total: 1,
      errors: [{ file: "b.ts", line: 10, column: 2, message: "mismatch" }],
    };
    const output = formatCheck(data);
    expect(output).toContain("b.ts:10:2 mismatch");
    // No "code: " prefix should be present
    expect(output).not.toContain("TS");
  });

  it("formats errors undefined", () => {
    const data: DenoCheckResult = {
      success: false,
      total: 1,
    };
    const output = formatCheck(data);
    expect(output).toContain("1 type errors");
  });
});

describe("formatTask — edge cases", () => {
  it("formats failed (non-timeout) task", () => {
    const data: DenoTaskResult = {
      task: "lint",
      success: false,
      exitCode: 1,
      duration: 200,
      timedOut: false,
      stderr: "lint error",
    };
    const output = formatTask(data);
    expect(output).toContain("deno task lint: exit code 1 (200ms).");
    expect(output).toContain("lint error");
  });
});

describe("formatRun — edge cases", () => {
  it("formats timed out run", () => {
    const data: DenoRunResult = {
      file: "slow.ts",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("deno run slow.ts: TIMED OUT after 60000ms");
  });
});

describe("formatInfo — edge cases", () => {
  it("formats info with local path", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "mod.ts",
      local: "/tmp/mod.ts",
      totalDependencies: 0,
    };
    const output = formatInfo(data);
    expect(output).toContain("local: /tmp/mod.ts");
  });

  it("formats dependency without size", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "mod.ts",
      totalDependencies: 1,
      dependencies: [{ specifier: "https://example.com/lib.ts", type: "remote" }],
    };
    const output = formatInfo(data);
    expect(output).toContain("https://example.com/lib.ts [remote]");
    expect(output).not.toContain("KB");
  });

  it("formats dependency without type", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "mod.ts",
      totalDependencies: 1,
      dependencies: [{ specifier: "unknown://dep" }],
    };
    const output = formatInfo(data);
    expect(output).toContain("unknown://dep");
    expect(output).not.toContain("[");
  });

  it("formats totalSize in MB range", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "big.ts",
      totalDependencies: 1,
      totalSize: 5 * 1024 * 1024,
    };
    const output = formatInfo(data);
    expect(output).toContain("5.0MB");
  });

  it("formats totalSize in bytes range", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "tiny.ts",
      totalDependencies: 0,
      totalSize: 500,
    };
    const output = formatInfo(data);
    expect(output).toContain("500B");
  });

  it("omits totalSize when zero or undefined", () => {
    const data: DenoInfoResult = {
      success: true,
      module: "empty.ts",
      totalDependencies: 0,
    };
    const output = formatInfo(data);
    expect(output).not.toContain("total size:");
  });

  it("formats info without module", () => {
    const data: DenoInfoResult = {
      success: true,
      totalDependencies: 2,
    };
    const output = formatInfo(data);
    expect(output).toContain("dependencies: 2");
    expect(output).not.toContain("deno info:");
  });
});

// ── Compact formatters — additional branch coverage ─────────────────

describe("formatFmtCompact / compactFmtMap", () => {
  it("compact check mode — success", () => {
    const data: DenoFmtResult = { success: true, mode: "check", total: 0 };
    const compact = compactFmtMap(data);
    expect(formatFmtCompact(compact)).toBe("deno fmt: all files formatted.");
  });

  it("compact check mode — failure", () => {
    const data: DenoFmtResult = {
      success: false,
      mode: "check",
      total: 3,
      files: ["a.ts", "b.ts", "c.ts"],
    };
    const compact = compactFmtMap(data);
    expect(compact).not.toHaveProperty("files");
    expect(formatFmtCompact(compact)).toBe("deno fmt: 3 files need formatting");
  });

  it("compact write mode — no changes", () => {
    const data: DenoFmtResult = { success: true, mode: "write", total: 0 };
    const compact = compactFmtMap(data);
    expect(formatFmtCompact(compact)).toBe("deno fmt: no files changed.");
  });

  it("compact write mode — formatted files", () => {
    const data: DenoFmtResult = { success: true, mode: "write", total: 2, files: ["a.ts", "b.ts"] };
    const compact = compactFmtMap(data);
    expect(formatFmtCompact(compact)).toBe("deno fmt: formatted 2 files");
  });
});

describe("formatCheckCompact / compactCheckMap", () => {
  it("compact check — success", () => {
    const data: DenoCheckResult = { success: true, total: 0 };
    const compact = compactCheckMap(data);
    expect(formatCheckCompact(compact)).toBe("deno check: no type errors.");
  });

  it("compact check — errors", () => {
    const data: DenoCheckResult = { success: false, total: 5 };
    const compact = compactCheckMap(data);
    expect(formatCheckCompact(compact)).toBe("deno check: 5 type errors");
  });
});

describe("formatTaskCompact — edge cases", () => {
  it("compact task — timed out", () => {
    const data: DenoTaskResult = {
      task: "slow",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
    };
    const compact = compactTaskMap(data);
    expect(formatTaskCompact(compact)).toContain("TIMED OUT");
    expect(formatTaskCompact(compact)).toContain("60000ms");
  });

  it("compact task — failed (non-timeout)", () => {
    const data: DenoTaskResult = {
      task: "lint",
      success: false,
      exitCode: 1,
      duration: 300,
      timedOut: false,
    };
    const compact = compactTaskMap(data);
    expect(formatTaskCompact(compact)).toContain("exit code 1");
  });
});

describe("formatRunCompact / compactRunMap", () => {
  it("compact run — success", () => {
    const data: DenoRunResult = {
      file: "main.ts",
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
    };
    const compact = compactRunMap(data);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
    expect(formatRunCompact(compact)).toContain("success (100ms)");
  });

  it("compact run — timed out", () => {
    const data: DenoRunResult = {
      file: "slow.ts",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
    };
    const compact = compactRunMap(data);
    expect(formatRunCompact(compact)).toContain("TIMED OUT");
  });

  it("compact run — failed (non-timeout)", () => {
    const data: DenoRunResult = {
      file: "bad.ts",
      success: false,
      exitCode: 1,
      duration: 50,
      timedOut: false,
    };
    const compact = compactRunMap(data);
    expect(formatRunCompact(compact)).toContain("exit code 1 (50ms)");
  });
});

describe("formatTestCompact — failed", () => {
  it("formats failed test compact", () => {
    const data: DenoTestResult = {
      success: false,
      total: 3,
      passed: 1,
      failed: 2,
      ignored: 0,
      filtered: 0,
      measured: 0,
      duration: 100,
    };
    const compact = compactTestMap(data);
    expect(formatTestCompact(compact)).toContain("FAILED");
  });
});

describe("formatLintCompact — no issues", () => {
  it("formats no issues", () => {
    const data: DenoLintResult = { success: true, total: 0, errors: 0 };
    const compact = compactLintMap(data);
    expect(formatLintCompact(compact)).toBe("deno lint: no issues found.");
  });
});
