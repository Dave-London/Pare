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
});
