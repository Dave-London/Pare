import { describe, it, expect } from "vitest";
import {
  parseTestOutput,
  parseLintJson,
  parseLintText,
  parseFmtCheck,
  parseFmtWrite,
  parseCheckOutput,
  parseTaskOutput,
  parseRunOutput,
  parseInfoJson,
  parseInfoText,
} from "../src/lib/parsers.js";

// ── deno test parser ─────────────────────────────────────────────────

describe("parseTestOutput", () => {
  it("parses passing test output", () => {
    const stdout = `running 3 tests from ./test.ts
test add ... ok (2ms)
test subtract ... ok (1ms)
test multiply ... ok (0ms)

ok | 3 passed | 0 failed | 0 ignored (10ms)`;

    const result = parseTestOutput(stdout, "", 0, 15);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.ignored).toBe(0);
    expect(result.duration).toBe(15);
    expect(result.tests).toHaveLength(3);
    expect(result.tests![0]).toEqual({ name: "add", status: "passed", duration: 2 });
    expect(result.tests![1]).toEqual({ name: "subtract", status: "passed", duration: 1 });
    expect(result.tests![2]).toEqual({ name: "multiply", status: "passed", duration: 0 });
  });

  it("parses mixed pass/fail/ignored output", () => {
    const stdout = `running 4 tests from ./test.ts
test passing ... ok (5ms)
test failing ... FAILED (2ms)
test skipped ... ignored (0ms)
test another pass ... ok (1ms)

FAILED | 2 passed | 1 failed | 1 ignored (20ms)`;

    const result = parseTestOutput(stdout, "", 1, 25);

    expect(result.success).toBe(false);
    expect(result.total).toBe(4);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.ignored).toBe(1);
    expect(result.tests).toHaveLength(4);
    expect(result.tests![1].status).toBe("failed");
    expect(result.tests![2].status).toBe("ignored");
  });

  it("handles empty test output", () => {
    const result = parseTestOutput("", "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.tests).toBeUndefined();
  });

  it("parses filtered count from output", () => {
    const stdout = `running 1 tests from ./test.ts
test matching ... ok (2ms)

ok | 1 passed | 0 failed | 0 ignored (5ms)
2 filtered out`;

    const result = parseTestOutput(stdout, "", 0, 8);

    expect(result.filtered).toBe(2);
    expect(result.passed).toBe(1);
  });
});

// ── deno lint parser ─────────────────────────────────────────────────

describe("parseLintJson", () => {
  it("parses clean lint JSON output", () => {
    const json = JSON.stringify({ diagnostics: [], errors: [] });
    const result = parseLintJson(json);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.diagnostics).toBeUndefined();
  });

  it("parses lint JSON with diagnostics", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          filename: "/project/src/main.ts",
          range: { start: { line: 5, col: 7 }, end: { line: 5, col: 10 } },
          code: "no-unused-vars",
          message: "'x' is never used",
          hint: "Remove the unused variable",
        },
        {
          filename: "/project/src/utils.ts",
          range: { start: { line: 12, col: 0 }, end: { line: 12, col: 15 } },
          code: "no-explicit-any",
          message: "Unexpected any. Specify a different type.",
        },
      ],
      errors: [],
    });

    const result = parseLintJson(json);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(2);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics![0]).toEqual({
      file: "/project/src/main.ts",
      line: 5,
      column: 7,
      code: "no-unused-vars",
      message: "'x' is never used",
      hint: "Remove the unused variable",
    });
    expect(result.diagnostics![1].hint).toBeUndefined();
  });

  it("includes errors array entries as diagnostics", () => {
    const json = JSON.stringify({
      diagnostics: [],
      errors: [
        {
          filename: "/project/bad.ts",
          line: 1,
          message: "Syntax error",
        },
      ],
    });

    const result = parseLintJson(json);

    expect(result.total).toBe(1);
    expect(result.diagnostics![0].file).toBe("/project/bad.ts");
  });
});

describe("parseLintText", () => {
  it("parses text format lint output", () => {
    const stdout = `(no-unused-vars) 'x' is never used
    at /project/src/main.ts:5:7
      hint: Remove the unused variable
(no-explicit-any) Unexpected any
    at /project/src/utils.ts:12:3
Found 2 problems`;

    const result = parseLintText(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics![0]).toEqual({
      file: "/project/src/main.ts",
      line: 5,
      column: 7,
      code: "no-unused-vars",
      message: "'x' is never used",
      hint: "Remove the unused variable",
    });
  });

  it("returns clean result for no issues", () => {
    const result = parseLintText("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });
});

// ── deno fmt parser ──────────────────────────────────────────────────

describe("parseFmtCheck", () => {
  it("detects all files formatted", () => {
    const result = parseFmtCheck("", "Checked 5 files", 0);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("check");
    expect(result.total).toBe(0);
    expect(result.files).toBeUndefined();
  });

  it("detects unformatted files with 'from' lines", () => {
    const stderr = `error: Found 2 not formatted files in 5 files
from ./src/main.ts
from ./src/utils.ts`;

    const result = parseFmtCheck("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.mode).toBe("check");
    expect(result.total).toBe(2);
    expect(result.files).toEqual(["./src/main.ts", "./src/utils.ts"]);
  });

  it("detects unformatted files from standalone paths", () => {
    const stderr = `./src/main.ts
./src/utils.ts`;

    const result = parseFmtCheck("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.files).toEqual(["./src/main.ts", "./src/utils.ts"]);
  });
});

describe("parseFmtWrite", () => {
  it("detects no files changed", () => {
    const result = parseFmtWrite("", "Checked 3 files", 0);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("write");
    expect(result.total).toBe(0);
  });

  it("detects formatted files", () => {
    const stdout = `./src/main.ts
./src/utils.ts`;

    const result = parseFmtWrite(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("write");
    expect(result.total).toBe(2);
    expect(result.files).toEqual(["./src/main.ts", "./src/utils.ts"]);
  });
});

// ── deno check parser ───────────────────────────────────────────────

describe("parseCheckOutput", () => {
  it("parses clean check output", () => {
    const result = parseCheckOutput("Check file:///project/main.ts", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBeUndefined();
  });

  it("parses type errors with 'at' format", () => {
    const stderr = `Check file:///project/main.ts
error: TS2322 [ERROR]: Type 'string' is not assignable to type 'number'.
    at file:///project/main.ts:5:3
error: TS2304 [ERROR]: Cannot find name 'foo'.
    at file:///project/utils.ts:10:7`;

    const result = parseCheckOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors![0]).toEqual({
      file: "project/main.ts",
      line: 5,
      column: 3,
      code: "TS2322",
      message: "Type 'string' is not assignable to type 'number'.",
    });
    expect(result.errors![1]).toEqual({
      file: "project/utils.ts",
      line: 10,
      column: 7,
      code: "TS2304",
      message: "Cannot find name 'foo'.",
    });
  });

  it("parses type errors with '-->' format", () => {
    const stderr = `error: TS2322 [ERROR]: Type 'string' is not assignable to type 'number'.
 --> /project/main.ts:5:3`;

    const result = parseCheckOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors![0].file).toBe("/project/main.ts");
    expect(result.errors![0].line).toBe(5);
  });
});

// ── deno task parser ─────────────────────────────────────────────────

describe("parseTaskOutput", () => {
  it("parses successful task output", () => {
    const result = parseTaskOutput("build", "Built successfully", "", 0, 500);

    expect(result.success).toBe(true);
    expect(result.task).toBe("build");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Built successfully");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(500);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed task output", () => {
    const result = parseTaskOutput("test", "", "Task failed", 1, 200);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("Task failed");
  });

  it("parses timed out task", () => {
    const result = parseTaskOutput("slow", "", "timed out", 124, 300000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });
});

// ── deno run parser ──────────────────────────────────────────────────

describe("parseRunOutput", () => {
  it("parses successful run output", () => {
    const result = parseRunOutput("main.ts", "Hello, World!", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.file).toBe("main.ts");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!");
    expect(result.duration).toBe(100);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed run output", () => {
    const result = parseRunOutput("bad.ts", "", "error: Module not found", 1, 50);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("error: Module not found");
  });

  it("parses timed out run", () => {
    const result = parseRunOutput("slow.ts", "", "timed out", 124, 300000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("trims trailing whitespace from stdout/stderr", () => {
    const result = parseRunOutput("test.ts", "output\n\n", "  \n", 0, 50);

    expect(result.stdout).toBe("output");
    expect(result.stderr).toBeUndefined();
  });
});

// ── deno info parser ─────────────────────────────────────────────────

describe("parseInfoJson", () => {
  it("parses JSON info output", () => {
    const json = JSON.stringify({
      roots: ["file:///project/main.ts"],
      modules: [
        {
          specifier: "file:///project/main.ts",
          size: 1024,
          mediaType: "TypeScript",
          local: "/project/main.ts",
        },
        { specifier: "https://deno.land/std/http/server.ts", size: 4096 },
        { specifier: "npm:chalk@5.0.0", size: 2048 },
      ],
    });

    const result = parseInfoJson(json, "main.ts");

    expect(result.success).toBe(true);
    expect(result.module).toBe("main.ts");
    expect(result.type).toBe("TypeScript");
    expect(result.totalDependencies).toBe(3);
    expect(result.totalSize).toBe(7168);
    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies![0].type).toBe("local");
    expect(result.dependencies![1].type).toBe("remote");
    expect(result.dependencies![2].type).toBe("npm");
  });

  it("handles empty modules array", () => {
    const json = JSON.stringify({ roots: [], modules: [] });
    const result = parseInfoJson(json);

    expect(result.success).toBe(true);
    expect(result.totalDependencies).toBe(0);
    expect(result.dependencies).toBeUndefined();
  });
});

describe("parseInfoText", () => {
  it("handles failed info command", () => {
    const result = parseInfoText("", "error: Module not found", 1, "bad.ts");

    expect(result.success).toBe(false);
    expect(result.module).toBe("bad.ts");
    expect(result.totalDependencies).toBe(0);
  });

  it("parses text info output header", () => {
    const stdout = `local: /project/main.ts
type: TypeScript
deps:
file:///project/main.ts
  https://deno.land/std/http/server.ts`;

    const result = parseInfoText(stdout, "", 0, "main.ts");

    expect(result.success).toBe(true);
    expect(result.type).toBe("TypeScript");
    expect(result.local).toBe("/project/main.ts");
  });
});
