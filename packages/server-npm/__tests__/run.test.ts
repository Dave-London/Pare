import { describe, it, expect } from "vitest";
import { parseRunOutput } from "../src/lib/parsers.js";
import { formatRun } from "../src/lib/formatters.js";
import type { NpmRun } from "../src/schemas/index.js";

describe("parseRunOutput", () => {
  it("parses successful script output", () => {
    const result = parseRunOutput("build", 0, "Build complete\nFiles emitted: 5", "", 2.3);

    expect(result.script).toBe("build");
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Build complete\nFiles emitted: 5");
    expect(result.stderr).toBe("");
    expect(result.duration).toBe(2.3);
  });

  it("parses failed script output", () => {
    const result = parseRunOutput(
      "build",
      1,
      "",
      "Error: Cannot find module './missing'\nnpm error code ELIFECYCLE",
      1.5,
    );

    expect(result.script).toBe("build");
    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Cannot find module");
    expect(result.duration).toBe(1.5);
  });

  it("trims whitespace from stdout and stderr", () => {
    const result = parseRunOutput("lint", 0, "\n  output here  \n\n", "\n  warn  \n", 0.8);

    expect(result.stdout).toBe("output here");
    expect(result.stderr).toBe("warn");
  });

  it("handles script with arguments", () => {
    const result = parseRunOutput("test", 0, "Tests passed: 42", "Coverage: 95%", 5.0);

    expect(result.script).toBe("test");
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Tests passed: 42");
    expect(result.stderr).toBe("Coverage: 95%");
  });

  it("handles script not found (exit code 1 with error message)", () => {
    const result = parseRunOutput(
      "nonexistent",
      1,
      "",
      'npm error Missing script: "nonexistent"\nnpm error\nnpm error To see a list of scripts, run:\nnpm error   npm run',
      0.2,
    );

    expect(result.script).toBe("nonexistent");
    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Missing script");
  });

  it("handles empty output from a successful script", () => {
    const result = parseRunOutput("clean", 0, "", "", 0.1);

    expect(result.script).toBe("clean");
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("handles non-zero exit codes other than 1", () => {
    const result = parseRunOutput("deploy", 2, "Deploying...", "SIGINT received", 10.5);

    expect(result.exitCode).toBe(2);
    expect(result.success).toBe(false);
  });
});

describe("formatRun", () => {
  it("formats successful script execution", () => {
    const data: NpmRun = {
      script: "build",
      exitCode: 0,
      stdout: "Build complete",
      stderr: "",
      success: true,
      duration: 2.3,
    };
    const output = formatRun(data);
    expect(output).toContain('Script "build" completed successfully in 2.3s');
    expect(output).toContain("stdout:");
    expect(output).toContain("Build complete");
    expect(output).not.toContain("stderr:");
  });

  it("formats failed script execution", () => {
    const data: NpmRun = {
      script: "test",
      exitCode: 1,
      stdout: "",
      stderr: "Test failed: assertion error",
      success: false,
      duration: 5.0,
    };
    const output = formatRun(data);
    expect(output).toContain('Script "test" failed (exit code 1) in 5s');
    expect(output).toContain("stderr:");
    expect(output).toContain("Test failed: assertion error");
    expect(output).not.toContain("stdout:");
  });

  it("formats script with both stdout and stderr", () => {
    const data: NpmRun = {
      script: "lint",
      exitCode: 0,
      stdout: "All files passed linting",
      stderr: "Warning: deprecated rule",
      success: true,
      duration: 1.2,
    };
    const output = formatRun(data);
    expect(output).toContain("stdout:");
    expect(output).toContain("stderr:");
  });

  it("formats script with no output", () => {
    const data: NpmRun = {
      script: "clean",
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
      duration: 0.1,
    };
    const output = formatRun(data);
    expect(output).toBe('Script "clean" completed successfully in 0.1s');
  });
});

// ─── Error path tests ────────────────────────────────────────────────────────

describe("parseRunOutput error paths", () => {
  it("handles permission error in stderr", () => {
    const result = parseRunOutput(
      "start",
      1,
      "",
      "Error: EACCES: permission denied, open '/var/log/app.log'\nnpm error code ELIFECYCLE",
      0.3,
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("EACCES");
    expect(result.stderr).toContain("permission denied");
  });

  it("handles timeout scenario (empty output, non-zero exit)", () => {
    const result = parseRunOutput("long-task", 1, "", "", 300.0);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.duration).toBe(300.0);
  });

  it("handles signal termination (SIGKILL exit code 137)", () => {
    const result = parseRunOutput("server", 137, "Starting server...", "Killed", 60.0);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(137);
    expect(result.stderr).toBe("Killed");
  });

  it("handles very large stdout output", () => {
    const largeOutput = "line\n".repeat(10000);
    const result = parseRunOutput("generate", 0, largeOutput, "", 5.0);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("line");
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});
