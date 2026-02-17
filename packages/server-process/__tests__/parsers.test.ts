import { describe, it, expect } from "vitest";
import { parseRunOutput } from "../src/lib/parsers.js";

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("echo", "hello world\n", "", 0, 50, false);

    expect(result.command).toBe("echo");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello world");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(50);
    expect(result.timedOut).toBe(false);
    expect(result.signal).toBeUndefined();
    expect(result.truncated).toBeUndefined();
  });

  it("parses failed run", () => {
    const result = parseRunOutput("node", "", "Error: module not found\n", 1, 200, false);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("Error: module not found");
    expect(result.timedOut).toBe(false);
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseRunOutput(
      "python",
      "Processing...\nDone.",
      "DeprecationWarning: ...",
      0,
      3000,
      false,
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Processing...\nDone.");
    expect(result.stderr).toBe("DeprecationWarning: ...");
  });

  it("handles empty stdout and stderr", () => {
    const result = parseRunOutput("true", "", "", 0, 10, false);

    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });

  it("parses timed-out run", () => {
    const result = parseRunOutput("sleep", "", "timed out", 124, 60000, true, "SIGTERM");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(124);
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe("SIGTERM");
    expect(result.duration).toBe(60000);
  });

  it("timed-out run is never success even with exit code 0", () => {
    const result = parseRunOutput("cmd", "partial output", "", 0, 5000, true, "SIGTERM");

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("handles empty signal string as undefined", () => {
    const result = parseRunOutput("test", "", "", 1, 100, false, "");

    expect(result.signal).toBeUndefined();
  });

  it("maps cpu resource usage from microseconds to milliseconds", () => {
    const result = parseRunOutput(
      "node",
      "ok",
      "",
      0,
      100,
      false,
      undefined,
      undefined,
      undefined,
      12500,
      3400,
    );

    expect(result.userCpuTimeMs).toBe(12.5);
    expect(result.systemCpuTimeMs).toBe(3.4);
  });
});

describe("parseRunOutput — maxOutputLines truncation", () => {
  it("truncates stdout to maxOutputLines", () => {
    const stdout = "line1\nline2\nline3\nline4\nline5\n";
    const result = parseRunOutput("cmd", stdout, "", 0, 100, false, undefined, 3);

    expect(result.stdout).toBe("line1\nline2\nline3");
    expect(result.stdoutTruncatedLines).toBe(2);
    expect(result.stderrTruncatedLines).toBeUndefined();
  });

  it("truncates stderr to maxOutputLines", () => {
    const stderr = "err1\nerr2\nerr3\nerr4\n";
    const result = parseRunOutput("cmd", "", stderr, 1, 100, false, undefined, 2);

    expect(result.stderr).toBe("err1\nerr2");
    expect(result.stderrTruncatedLines).toBe(2);
  });

  it("does not truncate when output is within limit", () => {
    const stdout = "line1\nline2\n";
    const result = parseRunOutput("cmd", stdout, "", 0, 100, false, undefined, 10);

    expect(result.stdout).toBe("line1\nline2");
    expect(result.stdoutTruncatedLines).toBeUndefined();
  });

  it("does not truncate when maxOutputLines is not set", () => {
    const stdout = "line1\nline2\nline3\nline4\nline5\n";
    const result = parseRunOutput("cmd", stdout, "", 0, 100, false);

    expect(result.stdout).toBe("line1\nline2\nline3\nline4\nline5");
    expect(result.stdoutTruncatedLines).toBeUndefined();
  });
});

describe("parseRunOutput — truncated (maxBuffer)", () => {
  it("sets truncated to true when passed", () => {
    const result = parseRunOutput(
      "cmd",
      "",
      "output exceeded maxBuffer",
      1,
      500,
      false,
      undefined,
      undefined,
      true,
    );

    expect(result.truncated).toBe(true);
    expect(result.success).toBe(false);
  });

  it("does not set truncated when false", () => {
    const result = parseRunOutput("cmd", "hello", "", 0, 100, false, undefined, undefined, false);

    expect(result.truncated).toBeUndefined();
  });

  it("does not set truncated when not provided", () => {
    const result = parseRunOutput("cmd", "hello", "", 0, 100, false);

    expect(result.truncated).toBeUndefined();
  });
});
