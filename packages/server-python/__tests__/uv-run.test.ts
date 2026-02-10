import { describe, it, expect } from "vitest";
import { parseUvRun } from "../src/lib/parsers.js";
import { formatUvRun } from "../src/lib/formatters.js";
import type { UvRun } from "../src/schemas/index.js";

describe("parseUvRun", () => {
  it("parses successful command", () => {
    const result = parseUvRun("Hello, world!\n", "", 0, 1500);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, world!\n");
    expect(result.stderr).toBe("");
    expect(result.duration).toBe(1.5);
  });

  it("parses failed command", () => {
    const result = parseUvRun("", "Error: file not found\n", 1, 250);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Error: file not found\n");
    expect(result.duration).toBe(0.25);
  });

  it("parses command with both stdout and stderr", () => {
    const result = parseUvRun("output data\n", "warning: deprecated\n", 0, 3000);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output data\n");
    expect(result.stderr).toBe("warning: deprecated\n");
    expect(result.duration).toBe(3);
  });

  it("rounds duration to milliseconds", () => {
    const result = parseUvRun("", "", 0, 1234);

    expect(result.duration).toBe(1.234);
  });
});

describe("formatUvRun", () => {
  it("formats successful run with output", () => {
    const data: UvRun = {
      exitCode: 0,
      stdout: "Hello, world!",
      stderr: "",
      success: true,
      duration: 1.5,
    };
    const output = formatUvRun(data);

    expect(output).toContain("uv run completed in 1.5s");
    expect(output).toContain("Hello, world!");
  });

  it("formats failed run", () => {
    const data: UvRun = {
      exitCode: 1,
      stdout: "",
      stderr: "Error occurred",
      success: false,
      duration: 0.5,
    };
    const output = formatUvRun(data);

    expect(output).toContain("uv run failed (exit 1) in 0.5s");
    expect(output).toContain("Error occurred");
  });

  it("formats run with no output", () => {
    const data: UvRun = {
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
      duration: 0.1,
    };
    const output = formatUvRun(data);

    expect(output).toBe("uv run completed in 0.1s");
  });
});
