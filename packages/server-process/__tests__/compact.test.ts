import { describe, it, expect } from "vitest";
import { compactRunMap, formatRunCompact } from "../src/lib/formatters.js";
import type { ProcessRunResultInternal } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// compactRunMap
// ---------------------------------------------------------------------------

describe("compactRunMap", () => {
  it("keeps exitCode, success, timedOut; drops command, duration, stdout, stderr", () => {
    const data: ProcessRunResultInternal = {
      command: "node",
      exitCode: 0,
      success: true,
      stdout: "Hello, world!\nLine 2\nLine 3",
      stderr: "",
      duration: 150,
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.timedOut).toBe(false);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves signal when present", () => {
    const data: ProcessRunResultInternal = {
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
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("handles failed command with no signal", () => {
    const data: ProcessRunResultInternal = {
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
    expect(compact).not.toHaveProperty("command");
    expect(compact).not.toHaveProperty("duration");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves truncated flag when true", () => {
    const data: ProcessRunResultInternal = {
      command: "cat",
      exitCode: 1,
      success: false,
      stdout: "",
      stderr: "maxBuffer exceeded",
      duration: 300,
      timedOut: false,
      truncated: true,
    };

    const compact = compactRunMap(data);

    expect(compact.truncated).toBe(true);
  });

  it("drops cpu metrics", () => {
    const data: ProcessRunResultInternal = {
      command: "node",
      exitCode: 0,
      success: true,
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
});

// ---------------------------------------------------------------------------
// formatRunCompact
// ---------------------------------------------------------------------------

describe("formatRunCompact", () => {
  it("formats successful compact run", () => {
    const compact = {
      success: true,
      exitCode: 0,
      timedOut: false,
    };
    expect(formatRunCompact(compact)).toBe("process: success.");
  });

  it("formats failed compact run", () => {
    const compact = {
      success: false,
      exitCode: 1,
      timedOut: false,
    };
    expect(formatRunCompact(compact)).toBe("process: exit code 1.");
  });

  it("formats timed-out compact run", () => {
    const compact = {
      success: false,
      exitCode: 124,
      timedOut: true,
      signal: "SIGTERM",
    };
    expect(formatRunCompact(compact)).toContain("timed out");
    expect(formatRunCompact(compact)).toContain("SIGTERM");
  });

  it("formats timed-out compact run without signal", () => {
    const compact = {
      success: false,
      exitCode: 124,
      timedOut: true,
    };
    expect(formatRunCompact(compact)).toContain("timed out");
    expect(formatRunCompact(compact)).not.toContain("SIGTERM");
  });

  it("formats truncated compact run", () => {
    const compact = {
      success: false,
      exitCode: 1,
      timedOut: false,
      truncated: true,
    };
    const output = formatRunCompact(compact);
    expect(output).toContain("process: exit code 1.");
    expect(output).toContain("[output truncated: maxBuffer exceeded]");
  });
});
