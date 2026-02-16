import { describe, it, expect } from "vitest";
import { parseGoRunOutput } from "../src/lib/parsers.js";
import { formatGoRun } from "../src/lib/formatters.js";
import type { GoRunResult } from "../src/schemas/index.js";

describe("parseGoRunOutput", () => {
  it("parses successful run with stdout", () => {
    const result = parseGoRunOutput("Hello, World!\n", "", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!");
    expect(result.stderr).toBe("");
  });

  it("parses failed run with stderr", () => {
    const stderr = "main.go:5:2: undefined: fmt.Prinln\n";
    const result = parseGoRunOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("main.go:5:2: undefined: fmt.Prinln");
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseGoRunOutput("output line\n", "warning: something\n", 0);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output line");
    expect(result.stderr).toBe("warning: something");
  });

  it("parses run with non-zero exit code (runtime panic)", () => {
    const stderr = [
      "goroutine 1 [running]:",
      "main.main()",
      "\t/app/main.go:10 +0x40",
      "exit status 2",
    ].join("\n");

    const result = parseGoRunOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("goroutine 1 [running]:");
  });

  it("parses empty output on success", () => {
    const result = parseGoRunOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("parses file not found error", () => {
    const stderr = "stat main.go: no such file or directory\n";
    const result = parseGoRunOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no such file or directory");
  });

  it("does not set truncation flags by default", () => {
    const result = parseGoRunOutput("output", "errors", 0);
    expect(result.stdoutTruncated).toBeUndefined();
    expect(result.stderrTruncated).toBeUndefined();
  });
});

describe("formatGoRun", () => {
  it("formats successful run with output", () => {
    const data: GoRunResult = {
      success: true,
      exitCode: 0,
      stdout: "Hello, World!",
      stderr: "",
    };
    const output = formatGoRun(data);
    expect(output).toContain("go run: success.");
    expect(output).toContain("Hello, World!");
  });

  it("formats failed run", () => {
    const data: GoRunResult = {
      success: false,
      exitCode: 2,
      stdout: "",
      stderr: "main.go:5:2: undefined: foo",
    };
    const output = formatGoRun(data);
    expect(output).toContain("go run: exit code 2.");
    expect(output).toContain("main.go:5:2: undefined: foo");
  });

  it("formats run with no output", () => {
    const data: GoRunResult = {
      success: true,
      exitCode: 0,
      stdout: "",
      stderr: "",
    };
    const output = formatGoRun(data);
    expect(output).toBe("go run: success.");
  });

  it("formats run with both stdout and stderr", () => {
    const data: GoRunResult = {
      success: true,
      exitCode: 0,
      stdout: "result: 42",
      stderr: "debug info",
    };
    const output = formatGoRun(data);
    expect(output).toContain("go run: success.");
    expect(output).toContain("result: 42");
    expect(output).toContain("debug info");
  });
});

describe("output truncation (maxOutput)", () => {
  it("truncates stdout when exceeding maxOutput and sets flag", () => {
    const longOutput = "x".repeat(2048);
    const data = parseGoRunOutput(longOutput + "\n", "", 0);
    const maxOutput = 1024;

    // Simulate the truncation logic from run.ts
    if (data.stdout && data.stdout.length > maxOutput) {
      data.stdout = data.stdout.slice(0, maxOutput) + "\n... (truncated)";
      data.stdoutTruncated = true;
    }

    expect(data.stdoutTruncated).toBe(true);
    expect(data.stdout!.length).toBeLessThan(longOutput.length);
    expect(data.stdout).toContain("... (truncated)");
  });

  it("truncates stderr when exceeding maxOutput and sets flag", () => {
    const longError = "e".repeat(2048);
    const data = parseGoRunOutput("", longError + "\n", 1);
    const maxOutput = 1024;

    if (data.stderr && data.stderr.length > maxOutput) {
      data.stderr = data.stderr.slice(0, maxOutput) + "\n... (truncated)";
      data.stderrTruncated = true;
    }

    expect(data.stderrTruncated).toBe(true);
    expect(data.stderr!.length).toBeLessThan(longError.length);
    expect(data.stderr).toContain("... (truncated)");
  });

  it("does not truncate when output is within limit", () => {
    const data = parseGoRunOutput("short output\n", "short error\n", 0);
    const maxOutput = 1024;

    if (data.stdout && data.stdout.length > maxOutput) {
      data.stdout = data.stdout.slice(0, maxOutput) + "\n... (truncated)";
      data.stdoutTruncated = true;
    }
    if (data.stderr && data.stderr.length > maxOutput) {
      data.stderr = data.stderr.slice(0, maxOutput) + "\n... (truncated)";
      data.stderrTruncated = true;
    }

    expect(data.stdoutTruncated).toBeUndefined();
    expect(data.stderrTruncated).toBeUndefined();
    expect(data.stdout).toBe("short output");
    expect(data.stderr).toBe("short error");
  });

  it("formats truncated output with indicator", () => {
    const data: GoRunResult = {
      success: true,
      exitCode: 0,
      stdout: "truncated content\n... (truncated)",
      stderr: "",
      stdoutTruncated: true,
    };
    const output = formatGoRun(data);
    expect(output).toContain("[stdout truncated]");
  });

  it("formats truncated stderr with indicator", () => {
    const data: GoRunResult = {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "truncated errors\n... (truncated)",
      stderrTruncated: true,
    };
    const output = formatGoRun(data);
    expect(output).toContain("[stderr truncated]");
  });
});
