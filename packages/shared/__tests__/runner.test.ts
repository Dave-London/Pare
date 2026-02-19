import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { run, escapeCmdArg } from "../src/runner.js";

// Helper script that prints its args as JSON — avoids issues with inline
// `-e` code being mangled by cmd.exe parentheses parsing on Windows.
const ARGS_SCRIPT = join(tmpdir(), "pare-test-print-args.js");
writeFileSync(ARGS_SCRIPT, "process.stdout.write(JSON.stringify(process.argv.slice(2)))");
afterAll(() => {
  if (existsSync(ARGS_SCRIPT)) unlinkSync(ARGS_SCRIPT);
});

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

  it("preserves multi-word arguments as single tokens", async () => {
    // Regression test: before the fix, args with spaces were split into
    // multiple tokens by cmd.exe on Windows (broke gh pr create --title).
    // Uses a temp-file script to avoid cmd.exe mangling inline -e code.
    const result = await run("node", [ARGS_SCRIPT, "multi word title", "another multi word arg"]);
    expect(result.exitCode).toBe(0);
    const args = JSON.parse(result.stdout.trim());
    expect(args).toEqual(["multi word title", "another multi word arg"]);
  });

  it("preserves args with metacharacters and spaces", async () => {
    const result = await run("node", [ARGS_SCRIPT, "hello & world", "a | b", "foo>bar baz"]);
    expect(result.exitCode).toBe(0);
    const args = JSON.parse(result.stdout.trim());
    expect(args).toEqual(["hello & world", "a | b", "foo>bar baz"]);
  });

  it("pipes stdin data to the child process", async () => {
    const stdinScript = join(tmpdir(), "pare-test-stdin.js");
    writeFileSync(
      stdinScript,
      "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(d))",
    );
    try {
      const result = await run("node", [stdinScript], { stdin: "hello from stdin" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("hello from stdin");
    } finally {
      unlinkSync(stdinScript);
    }
  });

  it("pipes multi-line stdin data preserving newlines", async () => {
    const stdinScript = join(tmpdir(), "pare-test-stdin-nl.js");
    writeFileSync(
      stdinScript,
      "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(d))",
    );
    try {
      const result = await run("node", [stdinScript], { stdin: "line1\n\nline2\nline3" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("line1\n\nline2\nline3");
    } finally {
      unlinkSync(stdinScript);
    }
  });
});

describe("run – env and edge cases", () => {
  it("passes custom env vars to the child process", async () => {
    const result = await run("node", ["-e", "console.log(process.env.PARE_TEST_VAR)"], {
      env: { PARE_TEST_VAR: "hello_from_test" },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello_from_test");
  });

  it("rejects with permission denied on EACCES", async () => {
    // Try to execute a directory — triggers EACCES on Unix
    if (process.platform !== "win32") {
      await expect(run("/tmp", [])).rejects.toThrow(/[Pp]ermission denied|EACCES/);
    }
  });
});

describe("run – timeout and process cleanup", () => {
  const FIXTURE_PATH = resolve(__dirname, "fixtures/parent-with-children.cjs");

  it("kills all descendant processes on timeout", async () => {
    // The fixture spawns a grandchild and writes its PID to a temp file.
    // After timeout, both parent and grandchild should be killed via
    // process group kill (detached: true + kill(-pid)).
    const pidFile = join(tmpdir(), `pare-test-grandchild-${process.pid}-${Date.now()}.pid`);

    await expect(run("node", [FIXTURE_PATH, pidFile], { timeout: 3000 })).rejects.toThrow(
      /timed out/,
    );

    // Read the grandchild PID — retry briefly in case write races with kill.
    // On slow Windows CI runners the fixture may not finish spawn() +
    // writeFileSync() before the timeout fires, so the file may appear late
    // or not at all.
    const { readFileSync, existsSync } = require("node:fs");
    let grandchildPid: number | undefined;
    for (let i = 0; i < 10; i++) {
      if (existsSync(pidFile)) {
        grandchildPid = parseInt(readFileSync(pidFile, "utf-8"), 10);
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    try {
      unlinkSync(pidFile);
    } catch {
      /* ignore */
    }

    // If the fixture never wrote the PID file, the test is inconclusive on
    // this platform but not a failure — the process was killed before it
    // could spawn the grandchild.
    if (grandchildPid && !isNaN(grandchildPid)) {
      // Poll for grandchild death — Windows process cleanup can be very slow.
      // process.kill(pid, 0) throws ESRCH when the process is gone.
      let dead = false;
      for (let i = 0; i < 20; i++) {
        try {
          process.kill(grandchildPid!, 0);
          // Still alive, wait and retry
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          dead = true;
          break;
        }
      }
      expect(dead).toBe(true);
    }
  }, 30_000);

  it("reports timeout with signal name and correct ms", async () => {
    await expect(
      run("node", ["-e", "setInterval(() => {}, 60000)"], { timeout: 200 }),
    ).rejects.toThrow(/timed out after 200ms.*SIGTERM/);
  });

  it("does not kill process on normal completion", async () => {
    const result = await run("node", ["-e", "console.log('done')"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("done");
  });

  it("rejects when output exceeds maxBuffer", async () => {
    // Generate 2 MB of output but set maxBuffer to 1 KB
    const script = `process.stdout.write("x".repeat(2 * 1024 * 1024))`;
    await expect(run("node", ["-e", script], { timeout: 10_000, maxBuffer: 1024 })).rejects.toThrow(
      /maxBuffer/,
    );
  });
});

describe("escapeCmdArg", () => {
  it("does not escape percent signs (only works in batch files, not cmd.exe /c)", () => {
    expect(escapeCmdArg("%PATH%")).toBe("%PATH%");
    expect(escapeCmdArg("100%")).toBe("100%");
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
    // "a&b|c^d<e>f%g%" should escape dangerous chars (but not %)
    expect(escapeCmdArg("a&b|c^d<e>f%g%")).toBe("a^&b^|c^^d^<e^>f%g%");
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
    // %  -> % (not escaped — only works in batch files)
    expect(escapeCmdArg("&|^<>%")).toBe("^&^|^^^<^>%");
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
    expect(escapeCmdArg("%%%")).toBe("%%%");
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

  it("passes newlines through unchanged when no spaces present", () => {
    // No spaces → no quoting → newlines pass through (rare edge case)
    expect(escapeCmdArg("line1\nline2")).toBe("line1\nline2");
  });

  it("replaces newlines with spaces when quoting (cmd.exe cannot handle newlines in args)", () => {
    // Newlines inside double-quoted args terminate the cmd.exe command line,
    // so they must be replaced with spaces when the arg needs quoting.
    expect(escapeCmdArg("multi word\nwith newline")).toBe('"multi word with newline"');
    expect(escapeCmdArg("title\n\nbody text")).toBe('"title  body text"');
    expect(escapeCmdArg("line1\r\nline2 spaced")).toBe('"line1 line2 spaced"');
  });

  it("wraps args with spaces in double quotes", () => {
    expect(escapeCmdArg("multi word title")).toBe('"multi word title"');
    expect(escapeCmdArg("hello world")).toBe('"hello world"');
    expect(escapeCmdArg("a b c")).toBe('"a b c"');
  });

  it("wraps args with tabs in double quotes", () => {
    expect(escapeCmdArg("col1\tcol2")).toBe('"col1\tcol2"');
  });

  it("wraps args with internal double quotes and doubles them", () => {
    expect(escapeCmdArg('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCmdArg('"quoted"')).toBe('"""quoted"""');
  });

  it("handles spaces + percent signs (quoted but % not escaped)", () => {
    expect(escapeCmdArg("%PATH% value")).toBe('"%PATH% value"');
  });

  it("handles spaces + metacharacters (metacharacters are literal inside quotes)", () => {
    // Inside double quotes, & | < > ^ are literal — no caret escaping needed
    expect(escapeCmdArg("hello & world")).toBe('"hello & world"');
    expect(escapeCmdArg("a | b")).toBe('"a | b"');
  });

  it("preserves git format specifiers (% must not be doubled)", () => {
    // Git uses %H, %h, %an, etc. in --format strings. Doubling % to %%
    // causes git to interpret %% as its own escape for literal %, outputting
    // the specifier name instead of the resolved value.
    const fmt = "--format=%H@@%h@@%an@@%ae@@%ar@@%D@@%s";
    expect(escapeCmdArg(fmt)).toBe(fmt);
  });
});
