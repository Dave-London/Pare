import { describe, it, expect } from "vitest";
import { formatRun, compactRunMap, formatRunCompact } from "../src/lib/formatters.js";
import type { ProcessRunResult } from "../src/schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: ProcessRunResult = {
      command: "echo",
      success: true,
      exitCode: 0,
      stdout: "hello world",
      duration: 50,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("echo: success (50ms).");
    expect(output).toContain("hello world");
  });

  it("formats failed run", () => {
    const data: ProcessRunResult = {
      command: "node",
      success: false,
      exitCode: 1,
      stderr: "Error: cannot find module",
      duration: 200,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("node: exit code 1 (200ms).");
    expect(output).toContain("Error: cannot find module");
  });

  it("formats timed-out run", () => {
    const data: ProcessRunResult = {
      command: "sleep",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
      signal: "SIGTERM",
    };
    const output = formatRun(data);
    expect(output).toContain("sleep: timed out after 60000ms (SIGTERM).");
  });

  it("formats timed-out run without signal", () => {
    const data: ProcessRunResult = {
      command: "sleep",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("sleep: timed out after 60000ms.");
    expect(output).not.toContain("SIGTERM");
  });

  it("formats run with no output", () => {
    const data: ProcessRunResult = {
      command: "true",
      success: true,
      exitCode: 0,
      duration: 10,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toBe("true: success (10ms).");
  });

  it("formats cpu metrics when present", () => {
    const data: ProcessRunResult = {
      command: "node",
      success: true,
      exitCode: 0,
      duration: 42,
      timedOut: false,
      userCpuTimeMs: 11.234,
      systemCpuTimeMs: 2.5,
    };
    const output = formatRun(data);
    expect(output).toContain("cpu: user=11.23ms, system=2.50ms");
  });

  it("formats truncated run", () => {
    const data: ProcessRunResult = {
      command: "cat",
      success: false,
      exitCode: 1,
      stderr: "output exceeded maxBuffer",
      duration: 300,
      timedOut: false,
      truncated: true,
    };
    const output = formatRun(data);
    expect(output).toContain("cat: exit code 1 (300ms).");
    expect(output).toContain("[output truncated: maxBuffer exceeded]");
    expect(output).toContain("output exceeded maxBuffer");
  });

  it("does not show truncation notice when not truncated", () => {
    const data: ProcessRunResult = {
      command: "echo",
      success: true,
      exitCode: 0,
      stdout: "hello",
      duration: 50,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).not.toContain("truncated: maxBuffer");
  });
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactRunMap", () => {
  it("keeps command, exitCode, success, duration, timedOut — drops stdout/stderr", () => {
    const data: ProcessRunResult = {
      command: "echo",
      success: true,
      exitCode: 0,
      stdout: "lots of output...",
      stderr: "some warnings",
      duration: 50,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.command).toBe("echo");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.duration).toBe(50);
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves signal and timedOut", () => {
    const data: ProcessRunResult = {
      command: "sleep",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
      signal: "SIGTERM",
    };

    const compact = compactRunMap(data);

    expect(compact.timedOut).toBe(true);
    expect(compact.signal).toBe("SIGTERM");
  });

  it("preserves cpu metrics", () => {
    const data: ProcessRunResult = {
      command: "node",
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
      userCpuTimeMs: 8.7,
      systemCpuTimeMs: 1.2,
    };
    const compact = compactRunMap(data);
    expect(compact.userCpuTimeMs).toBe(8.7);
    expect(compact.systemCpuTimeMs).toBe(1.2);
  });

  it("preserves non-zero exit code", () => {
    const data: ProcessRunResult = {
      command: "node",
      success: false,
      exitCode: 2,
      stderr: "error details",
      duration: 567,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.success).toBe(false);
  });

  it("preserves truncated flag", () => {
    const data: ProcessRunResult = {
      command: "cat",
      success: false,
      exitCode: 1,
      stderr: "maxBuffer exceeded",
      duration: 300,
      timedOut: false,
      truncated: true,
    };

    const compact = compactRunMap(data);

    expect(compact.truncated).toBe(true);
  });

  it("does not include truncated when undefined", () => {
    const data: ProcessRunResult = {
      command: "echo",
      success: true,
      exitCode: 0,
      duration: 50,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.truncated).toBeUndefined();
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(
      formatRunCompact({
        command: "echo",
        exitCode: 0,
        success: true,
        duration: 50,
        timedOut: false,
      }),
    ).toBe("echo: success (50ms).");
  });

  it("formats failed run with exit code", () => {
    expect(
      formatRunCompact({
        command: "node",
        exitCode: 1,
        success: false,
        duration: 200,
        timedOut: false,
      }),
    ).toBe("node: exit code 1 (200ms).");
  });

  it("formats timed-out run", () => {
    expect(
      formatRunCompact({
        command: "sleep",
        exitCode: 124,
        success: false,
        duration: 60000,
        timedOut: true,
        signal: "SIGTERM",
      }),
    ).toBe("sleep: timed out after 60000ms (SIGTERM).");
  });

  it("formats timed-out run without signal", () => {
    expect(
      formatRunCompact({
        command: "sleep",
        exitCode: 124,
        success: false,
        duration: 60000,
        timedOut: true,
      }),
    ).toBe("sleep: timed out after 60000ms.");
  });

  it("formats truncated run", () => {
    const output = formatRunCompact({
      command: "cat",
      exitCode: 1,
      success: false,
      duration: 300,
      timedOut: false,
      truncated: true,
    });
    expect(output).toContain("cat: exit code 1 (300ms).");
    expect(output).toContain("[output truncated: maxBuffer exceeded]");
  });
});
