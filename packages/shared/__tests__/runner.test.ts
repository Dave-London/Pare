import { describe, it, expect } from "vitest";
import { run, escapeCmdArg } from "../src/runner.js";

describe("run", () => {
  it("returns stdout and stderr with exit code 0 on success", async () => {
    const result = await run("node", ["-e", "console.log('hello')"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
  });

  it("returns non-zero exit code for failing commands", async () => {
    const result = await run("node", ["-e", "process.exit(42)"]);
    expect(result.exitCode).toBe(42);
  });

  it("strips ANSI codes from output", async () => {
    const result = await run("node", ["-e", "console.log('\\x1b[31mred\\x1b[0m')"]);
    expect(result.stdout.trim()).toBe("red");
  });

  it("throws on command not found (ENOENT)", async () => {
    await expect(run("__nonexistent_command_that_does_not_exist__", ["arg"])).rejects.toThrow(
      /[Cc]ommand not found|is not recognized/,
    );
  });

  it("respects cwd option", async () => {
    const result = await run("node", ["-e", "console.log(process.cwd())"], {
      cwd: process.env.TEMP || "/tmp",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBeTruthy();
  });
});

describe("escapeCmdArg", () => {
  it("escapes percent signs for env-var expansion prevention", () => {
    expect(escapeCmdArg("%PATH%")).toBe("%%PATH%%");
    expect(escapeCmdArg("100%")).toBe("100%%");
  });

  it("escapes ampersand to prevent command chaining", () => {
    expect(escapeCmdArg("foo&bar")).toBe("foo^&bar");
    expect(escapeCmdArg("a&&b")).toBe("a^&^&b");
  });

  it("escapes pipe to prevent piping", () => {
    expect(escapeCmdArg("foo|bar")).toBe("foo^|bar");
  });

  it("escapes caret (cmd.exe escape char itself)", () => {
    expect(escapeCmdArg("foo^bar")).toBe("foo^^bar");
  });

  it("escapes angle brackets to prevent redirection", () => {
    expect(escapeCmdArg("foo>bar")).toBe("foo^>bar");
    expect(escapeCmdArg("foo<bar")).toBe("foo^<bar");
  });

  it("handles multiple metacharacters in one string", () => {
    // "a&b|c^d<e>f%g%" should escape all dangerous chars
    expect(escapeCmdArg("a&b|c^d<e>f%g%")).toBe("a^&b^|c^^d^<e^>f%%g%%");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeCmdArg("hello")).toBe("hello");
    expect(escapeCmdArg("src/index.ts")).toBe("src/index.ts");
    expect(escapeCmdArg("--flag=value")).toBe("--flag=value");
  });

  it("handles empty string", () => {
    expect(escapeCmdArg("")).toBe("");
  });

  it("does not escape parentheses (safe inside double quotes)", () => {
    expect(escapeCmdArg("(foo)")).toBe("(foo)");
  });

  it("handles strings composed entirely of metacharacters", () => {
    // &  -> ^&
    // |  -> ^|
    // ^  -> ^^ (caret escaped first)
    // <  -> ^<
    // >  -> ^>
    // %  -> %% (percent escaped first)
    expect(escapeCmdArg("&|^<>%")).toBe("^&^|^^^<^>%%");
  });

  it("handles very long strings without error", () => {
    const longArg = "a".repeat(100_000);
    const result = escapeCmdArg(longArg);
    expect(result).toBe(longArg);
    expect(result.length).toBe(100_000);
  });

  it("handles very long strings with metacharacters", () => {
    const longArg = "&".repeat(1_000);
    const result = escapeCmdArg(longArg);
    // Each & becomes ^& (2 chars)
    expect(result.length).toBe(2_000);
    expect(result).toBe("^&".repeat(1_000));
  });

  it("handles string with only percent signs", () => {
    expect(escapeCmdArg("%%%")).toBe("%%%%%%");
  });

  it("handles string with only carets", () => {
    expect(escapeCmdArg("^^^")).toBe("^^^^^^");
  });

  it("escapes exclamation mark to prevent delayed expansion", () => {
    expect(escapeCmdArg("hello!world")).toBe("hello^!world");
    expect(escapeCmdArg("!PATH!")).toBe("^!PATH^!");
  });

  it("escapes exclamation mark combined with other metacharacters", () => {
    expect(escapeCmdArg("!foo&bar!")).toBe("^!foo^&bar^!");
  });

  it("handles newlines and tabs (not metacharacters, passed through)", () => {
    expect(escapeCmdArg("line1\nline2")).toBe("line1\nline2");
    expect(escapeCmdArg("col1\tcol2")).toBe("col1\tcol2");
  });
});
