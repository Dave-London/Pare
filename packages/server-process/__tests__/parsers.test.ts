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
});
