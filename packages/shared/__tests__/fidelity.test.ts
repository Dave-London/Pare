/**
 * Fidelity tests for shared utilities: stripAnsi, dualOutput, run, assertNoFlagInjection.
 *
 * These tests use real-world ANSI sequences and live command execution
 * to verify that Pare's shared helpers behave correctly with production inputs.
 */
import { describe, it, expect } from "vitest";
import { stripAnsi } from "../src/ansi.js";
import { dualOutput } from "../src/output.js";
import { run } from "../src/runner.js";
import { assertNoFlagInjection } from "../src/validation.js";

// ---------------------------------------------------------------------------
// stripAnsi — fidelity tests
// ---------------------------------------------------------------------------
describe("fidelity: stripAnsi", () => {
  it("strips real SGR color codes from test-runner output", () => {
    // Simulates vitest-style "checkmark green, then reset" output
    const input = "\x1b[32m\u2713\x1b[39m test passed";
    expect(stripAnsi(input)).toBe("\u2713 test passed");
  });

  it("strips bold, underline, and reset sequences", () => {
    // Bold on, underline on, text, underline off, bold off, reset
    const input = "\x1b[1m\x1b[4mHeading\x1b[24m\x1b[22m\x1b[0m";
    expect(stripAnsi(input)).toBe("Heading");
  });

  it("strips cursor movement sequences", () => {
    // Cursor up 2, cursor forward 5, then text
    const input = "\x1b[2A\x1b[5CProgress: 100%";
    expect(stripAnsi(input)).toBe("Progress: 100%");
  });

  it("strips nested/interleaved ANSI codes correctly", () => {
    // Red bg, white fg, bold text with interspersed resets
    const input =
      "\x1b[41m\x1b[37m\x1b[1m FAIL \x1b[22m\x1b[39m\x1b[49m src/app.test.ts";
    expect(stripAnsi(input)).toBe(" FAIL  src/app.test.ts");
  });

  it("returns empty string unchanged", () => {
    expect(stripAnsi("")).toBe("");
  });

  it("returns plain text without ANSI codes unchanged", () => {
    const plain = "No special characters here! Just text (123).";
    expect(stripAnsi(plain)).toBe(plain);
  });

  it("strips OSC (Operating System Command) sequences", () => {
    // OSC hyperlink sequence used by some terminals
    const input = "\x1b]8;;https://example.com\x07Click here\x1b]8;;\x07";
    expect(stripAnsi(input)).toBe("Click here");
  });

  it("strips real npm warning output ANSI codes", () => {
    // npm often wraps warnings in yellow
    const input = "\x1b[33mnpm warn\x1b[39m deprecated package@1.0.0";
    expect(stripAnsi(input)).toBe("npm warn deprecated package@1.0.0");
  });
});

// ---------------------------------------------------------------------------
// dualOutput — fidelity tests
// ---------------------------------------------------------------------------
describe("fidelity: dualOutput", () => {
  it("returns both content (text) and structuredContent (typed JSON)", () => {
    const data = { total: 10, passed: 8, failed: 2 };
    const formatter = (d: typeof data) => `Tests: ${d.passed}/${d.total}`;

    const result = dualOutput(data, formatter);

    expect(result.content).toEqual([{ type: "text", text: "Tests: 8/10" }]);
    expect(result.structuredContent).toEqual(data);
  });

  it("calls the formatter function with the exact data object", () => {
    const data = { files: ["a.ts", "b.ts"], count: 2 };
    let receivedData: unknown = null;
    const formatter = (d: typeof data) => {
      receivedData = d;
      return "formatted";
    };

    dualOutput(data, formatter);

    expect(receivedData).toBe(data); // same reference
  });

  it("structuredContent is the exact same reference as input data", () => {
    const data = { branch: "main", ahead: 0, behind: 3 };
    const result = dualOutput(data, () => "branch info");

    expect(result.structuredContent).toBe(data);
  });

  it("handles complex nested data structures", () => {
    const data = {
      summary: { lines: 85.5, branches: 72.1 },
      files: [
        { file: "index.ts", lines: 90 },
        { file: "utils.ts", lines: 80 },
      ],
    };
    const formatter = (d: typeof data) =>
      `Coverage: ${d.summary.lines}% lines, ${d.files.length} files`;

    const result = dualOutput(data, formatter);

    expect(result.content[0].text).toBe("Coverage: 85.5% lines, 2 files");
    expect(result.structuredContent.files).toHaveLength(2);
    expect(result.structuredContent.summary.lines).toBe(85.5);
  });
});

// ---------------------------------------------------------------------------
// run — fidelity tests (uses real cross-platform commands via node -e)
// Uses single-quoted JS inside -e for Windows cmd.exe compatibility
// (shell: true wraps args in double quotes, so inner single quotes work).
// ---------------------------------------------------------------------------
describe("fidelity: run", () => {
  it("captures stdout from a successful command (exitCode 0)", async () => {
    const result = await run("node", ["-e", "console.log('hello')"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
  });

  it("returns non-zero exitCode from a failing command", async () => {
    const result = await run("node", ["-e", "process.exit(42)"]);

    expect(result.exitCode).toBe(42);
  });

  it("strips ANSI codes from command output", async () => {
    // Matches the pattern used by the existing runner.test.ts that works cross-platform
    const result = await run("node", ["-e", "console.log('\\x1b[31mred\\x1b[0m')"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("red");
    expect(result.stdout).not.toContain("\x1b[");
  });

  it("rejects with a clear message for a non-existent command", async () => {
    await expect(
      run("__nonexistent_command_that_does_not_exist__", ["--version"]),
    ).rejects.toThrow(/[Cc]ommand not found|is not recognized/);
  });

  it("respects the cwd option", async () => {
    const result = await run("node", ["-e", "console.log(process.cwd())"], {
      cwd: process.env.TEMP || "/tmp",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// assertNoFlagInjection — fidelity tests
// ---------------------------------------------------------------------------
describe("fidelity: assertNoFlagInjection", () => {
  it("allows a normal value without throwing", () => {
    expect(() => assertNoFlagInjection("main", "ref")).not.toThrow();
  });

  it("allows values with hyphens in the middle", () => {
    expect(() => assertNoFlagInjection("feature-branch", "ref")).not.toThrow();
  });

  it("throws for a value starting with single dash", () => {
    expect(() => assertNoFlagInjection("-v", "flag")).toThrow(
      /must not start with "-"/,
    );
  });

  it("throws for a value starting with double dash", () => {
    expect(() => assertNoFlagInjection("--output=/etc/passwd", "ref")).toThrow(
      /must not start with "-"/,
    );
  });

  it("includes the parameter name in the error message", () => {
    expect(() => assertNoFlagInjection("-x", "myParam")).toThrow(/myParam/);
  });
});
