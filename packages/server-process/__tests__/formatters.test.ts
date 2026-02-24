import { describe, it, expect } from "vitest";
import { formatRun, compactRunMap, formatRunCompact } from "../src/lib/formatters.js";
import type { ProcessRunResultInternal } from "../src/schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
  it("keeps exitCode, success, timedOut; drops command, duration, stdout, stderr", () => {
    const data: ProcessRunResultInternal = {
      command: "echo",
      success: true,
      exitCode: 0,
      stdout: "lots of output...",
      stderr: "some warnings",
      duration: 50,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves signal and timedOut", () => {
    const data: ProcessRunResultInternal = {
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
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
  });

  it("drops cpu metrics", () => {
    const data: ProcessRunResultInternal = {
      command: "node",
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
      userCpuTimeMs: 8.7,
      systemCpuTimeMs: 1.2,
    };
    const compact = compactRunMap(data);
    expect(compact).not.toHaveProperty("userCpuTimeMs");
    expect(compact).not.toHaveProperty("systemCpuTimeMs");
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
  });

  it("preserves non-zero exit code", () => {
    const data: ProcessRunResultInternal = {
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
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
  });

  it("preserves truncated flag", () => {
    const data: ProcessRunResultInternal = {
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
    const data: ProcessRunResultInternal = {
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
        exitCode: 0,
        success: true,
        timedOut: false,
      }),
    ).toBe("process: success.");
  });

  it("formats failed run with exit code", () => {
    expect(
      formatRunCompact({
        exitCode: 1,
        success: false,
        timedOut: false,
      }),
    ).toBe("process: exit code 1.");
  });

  it("formats timed-out run", () => {
    const output = formatRunCompact({
      exitCode: 124,
      success: false,
      timedOut: true,
      signal: "SIGTERM",
    });
    expect(output).toContain("timed out");
    expect(output).toContain("SIGTERM");
  });

  it("formats timed-out run without signal", () => {
    const output = formatRunCompact({
      exitCode: 124,
      success: false,
      timedOut: true,
    });
    expect(output).toContain("timed out");
    expect(output).not.toContain("SIGTERM");
  });

  it("formats truncated run", () => {
    const output = formatRunCompact({
      exitCode: 1,
      success: false,
      timedOut: false,
      truncated: true,
    });
    expect(output).toContain("process: exit code 1.");
    expect(output).toContain("[output truncated: maxBuffer exceeded]");
  });
});
