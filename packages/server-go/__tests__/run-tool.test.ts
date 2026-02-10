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
