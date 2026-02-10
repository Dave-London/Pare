import { describe, it, expect } from "vitest";
import { parseCargoRunOutput } from "../src/lib/parsers.js";
import { formatCargoRun } from "../src/lib/formatters.js";

describe("parseCargoRunOutput", () => {
  it("parses successful run", () => {
    const result = parseCargoRunOutput("Hello, world!\n", "", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, world!\n");
    expect(result.stderr).toBe("");
  });

  it("parses failed run", () => {
    const result = parseCargoRunOutput("", "error: could not compile `myapp`", 101);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(101);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("could not compile");
  });

  it("captures both stdout and stderr", () => {
    const result = parseCargoRunOutput(
      "output line 1\noutput line 2\n",
      "warning: unused variable\n",
      0,
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("output line 1");
    expect(result.stdout).toContain("output line 2");
    expect(result.stderr).toContain("unused variable");
  });

  it("handles binary not found (non-zero exit)", () => {
    const result = parseCargoRunOutput(
      "",
      "error[E0425]: cannot find value `main` in this scope",
      101,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(101);
  });

  it("handles empty output", () => {
    const result = parseCargoRunOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

describe("formatCargoRun", () => {
  it("formats successful run", () => {
    const output = formatCargoRun({
      exitCode: 0,
      stdout: "Hello, world!",
      stderr: "",
      success: true,
    });

    expect(output).toContain("cargo run: success (exit code 0)");
    expect(output).toContain("Hello, world!");
  });

  it("formats failed run", () => {
    const output = formatCargoRun({
      exitCode: 1,
      stdout: "",
      stderr: "error: process exited with code 1",
      success: false,
    });

    expect(output).toContain("cargo run: failed (exit code 1)");
    expect(output).toContain("error: process exited with code 1");
  });

  it("omits empty stdout/stderr sections", () => {
    const output = formatCargoRun({
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
    });

    expect(output).toBe("cargo run: success (exit code 0)");
    expect(output).not.toContain("stdout:");
    expect(output).not.toContain("stderr:");
  });
});
