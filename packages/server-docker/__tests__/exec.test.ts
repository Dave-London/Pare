import { describe, it, expect } from "vitest";
import { parseExecOutput } from "../src/lib/parsers.js";
import { formatExec } from "../src/lib/formatters.js";
import type { DockerExec } from "../src/schemas/index.js";

describe("parseExecOutput", () => {
  it("parses successful exec", () => {
    const result = parseExecOutput("bin\ndev\netc\nhome\n", "", 0);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("bin\ndev\netc\nhome\n");
    expect(result.stderr).toBe("");
    expect(result.success).toBe(true);
  });

  it("parses failed exec", () => {
    const result = parseExecOutput(
      "",
      "ls: cannot access '/nonexistent': No such file or directory",
      2,
    );

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("No such file or directory");
    expect(result.success).toBe(false);
  });

  it("parses exec with both stdout and stderr", () => {
    const result = parseExecOutput("output data", "warning: something", 0);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("output data");
    expect(result.stderr).toBe("warning: something");
    expect(result.success).toBe(true);
  });

  it("parses exec with exit code 1", () => {
    const result = parseExecOutput("", "command not found: foo", 1);

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
  });

  it("parses exec with exit code 126 (permission denied)", () => {
    const result = parseExecOutput("", "permission denied", 126);

    expect(result.exitCode).toBe(126);
    expect(result.success).toBe(false);
  });

  it("handles empty output", () => {
    const result = parseExecOutput("", "", 0);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.success).toBe(true);
  });
});

describe("formatExec", () => {
  it("formats successful exec with stdout", () => {
    const data: DockerExec = {
      exitCode: 0,
      stdout: "hello world",
      stderr: "",
      success: true,
    };
    const output = formatExec(data);
    expect(output).toContain("Exec succeeded");
    expect(output).toContain("hello world");
  });

  it("formats failed exec with stderr", () => {
    const data: DockerExec = {
      exitCode: 1,
      stdout: "",
      stderr: "command not found",
      success: false,
    };
    const output = formatExec(data);
    expect(output).toContain("Exec failed (exit code 1)");
    expect(output).toContain("stderr: command not found");
  });

  it("formats exec with empty output", () => {
    const data: DockerExec = {
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
    };
    const output = formatExec(data);
    expect(output).toBe("Exec succeeded");
  });

  it("formats exec with both stdout and stderr", () => {
    const data: DockerExec = {
      exitCode: 0,
      stdout: "result data",
      stderr: "debug info",
      success: true,
    };
    const output = formatExec(data);
    expect(output).toContain("Exec succeeded");
    expect(output).toContain("result data");
    expect(output).toContain("stderr: debug info");
  });
});
