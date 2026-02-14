import { describe, it, expect } from "vitest";
import { compactRunMap, formatRunCompact } from "../src/lib/formatters.js";
import type { ProcessRunResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// compactRunMap
// ---------------------------------------------------------------------------

describe("compactRunMap", () => {
  it("keeps command, success, exitCode, duration, timedOut; drops stdout and stderr", () => {
    const data: ProcessRunResult = {
      command: "node",
      exitCode: 0,
      success: true,
      stdout: "Hello, world!\nLine 2\nLine 3",
      stderr: "",
      duration: 150,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.command).toBe("node");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.duration).toBe(150);
    expect(compact.timedOut).toBe(false);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves signal when present", () => {
    const data: ProcessRunResult = {
      command: "sleep",
      exitCode: 124,
      success: false,
      stdout: "",
      stderr: "timed out",
      duration: 60000,
      timedOut: true,
      signal: "SIGTERM",
    };

    const compact = compactRunMap(data);

    expect(compact.timedOut).toBe(true);
    expect(compact.signal).toBe("SIGTERM");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("handles failed command with no signal", () => {
    const data: ProcessRunResult = {
      command: "false",
      exitCode: 1,
      success: false,
      stdout: "",
      stderr: "command failed",
      duration: 5,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.success).toBe(false);
    expect(compact.exitCode).toBe(1);
    expect(compact.signal).toBeUndefined();
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

// ---------------------------------------------------------------------------
// formatRunCompact
// ---------------------------------------------------------------------------

describe("formatRunCompact", () => {
  it("formats successful compact run", () => {
    const compact = {
      command: "node",
      success: true,
      exitCode: 0,
      duration: 150,
      timedOut: false,
    };
    expect(formatRunCompact(compact)).toBe("node: success (150ms).");
  });

  it("formats failed compact run", () => {
    const compact = {
      command: "false",
      success: false,
      exitCode: 1,
      duration: 5,
      timedOut: false,
    };
    expect(formatRunCompact(compact)).toBe("false: exit code 1 (5ms).");
  });

  it("formats timed-out compact run", () => {
    const compact = {
      command: "sleep",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
      signal: "SIGTERM",
    };
    expect(formatRunCompact(compact)).toBe("sleep: timed out after 60000ms (SIGTERM).");
  });

  it("formats timed-out compact run without signal", () => {
    const compact = {
      command: "sleep",
      success: false,
      exitCode: 124,
      duration: 60000,
      timedOut: true,
    };
    expect(formatRunCompact(compact)).toBe("sleep: timed out after 60000ms.");
  });
});
