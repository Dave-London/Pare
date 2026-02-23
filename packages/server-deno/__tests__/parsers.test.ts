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

  it("parses text info with npm dependencies", () => {
    const stdout = `local: /project/main.ts
type: TypeScript
deps:
file:///project/main.ts
  npm:chalk@5.0.0
  https://deno.land/std@0.200.0/path/mod.ts`;

    const result = parseInfoText(stdout, "", 0, "main.ts");

    expect(result.success).toBe(true);
    expect(result.totalDependencies).toBe(3);
    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies![0].type).toBe("local");
    expect(result.dependencies![1].type).toBe("npm");
    expect(result.dependencies![2].type).toBe("remote");
  });

  it("returns no type/local when not in output", () => {
    const result = parseInfoText("deps:\nfile:///a.ts", "", 0);
    expect(result.type).toBeUndefined();
    expect(result.local).toBeUndefined();
  });

  it("returns empty dependencies when no dep lines match", () => {
    const result = parseInfoText("no deps here", "", 0, "mod.ts");
    expect(result.totalDependencies).toBe(0);
    expect(result.dependencies).toBeUndefined();
  });
});

// ── Additional parser branch coverage ───────────────────────────────

describe("parseTestOutput — error block parsing", () => {
  it("parses failure section with error messages", () => {
    const stdout = `running 2 tests from ./test.ts
test passing ... ok (5ms)
test failing ... FAILED (2ms)

FAILED | 1 passed | 1 failed | 0 ignored (10ms)

failures:

---- failing ----
AssertionError: expected 1 to equal 2
    at test.ts:5:3
`;

    const result = parseTestOutput(stdout, "", 1, 15);

    expect(result.failed).toBe(1);
    expect(result.tests).toHaveLength(2);
    const failedTest = result.tests!.find((t) => t.status === "failed");
    expect(failedTest).toBeDefined();
    expect(failedTest!.error).toContain("AssertionError");
  });

  it("falls back to counting when no summary line", () => {
    const stdout = `test a ... ok (1ms)
test b ... FAILED (2ms)
test c ... ignored (0ms)`;

    const result = parseTestOutput(stdout, "", 1, 10);

    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.ignored).toBe(1);
    expect(result.total).toBe(3);
  });

  it("parses measured count from output", () => {
    const stdout = `running 2 tests from ./bench.ts
test bench1 ... ok (100ms)
test bench2 ... ok (200ms)

ok | 2 passed | 0 failed | 0 ignored (350ms)
1 measured`;

    const result = parseTestOutput(stdout, "", 0, 350);
    expect(result.measured).toBe(1);
  });
});

describe("parseLintJson — edge cases", () => {
  it("handles diagnostics with fallback field names", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          file: "/project/a.ts",
          line: 10,
          column: 5,
          message: "unused var",
        },
      ],
      errors: [],
    });

    const result = parseLintJson(json);

    expect(result.diagnostics![0].file).toBe("/project/a.ts");
    expect(result.diagnostics![0].line).toBe(10);
    expect(result.diagnostics![0].column).toBe(5);
  });

  it("handles diagnostics without optional fields", () => {
    const json = JSON.stringify({
      diagnostics: [
        {
          filename: "/a.ts",
          range: { start: { line: 1 } },
          message: "err",
        },
      ],
    });

    const result = parseLintJson(json);

    expect(result.diagnostics![0].column).toBeUndefined();
    expect(result.diagnostics![0].code).toBeUndefined();
    expect(result.diagnostics![0].hint).toBeUndefined();
  });

  it("handles errors array with fallback field names", () => {
    const json = JSON.stringify({
      diagnostics: [],
      errors: [
        {
          file: "/b.ts",
          line: 5,
          column: 3,
          code: "syntax",
          message: "syntax error",
        },
      ],
    });

    const result = parseLintJson(json);

    expect(result.total).toBe(1);
    expect(result.diagnostics![0].file).toBe("/b.ts");
    expect(result.diagnostics![0].line).toBe(5);
    expect(result.diagnostics![0].column).toBe(3);
    expect(result.diagnostics![0].code).toBe("syntax");
  });
});

describe("parseFmtCheck — edge cases", () => {
  it("detects unformatted .tsx files from standalone paths", () => {
    const stderr = `./src/component.tsx`;

    const result = parseFmtCheck("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.files).toEqual(["./src/component.tsx"]);
  });

  it("detects unformatted .jsx files", () => {
    const result = parseFmtCheck("", "./app.jsx", 1);
    expect(result.total).toBe(1);
  });

  it("detects unformatted .json files", () => {
    const result = parseFmtCheck("", "./config.json", 1);
    expect(result.total).toBe(1);
  });

  it("detects unformatted .md files", () => {
    const result = parseFmtCheck("", "./README.md", 1);
    expect(result.total).toBe(1);
  });

  it("ignores error: and Checked lines in standalone mode", () => {
    const stderr = `error: Found 1 not formatted file
Checked 5 files
./src/main.ts`;

    const result = parseFmtCheck("", stderr, 1);

    // The "from" pattern won't match, so it falls through to standalone
    // error: and Checked lines should be skipped
    expect(result.files).toEqual(["./src/main.ts"]);
  });

  it("returns no files when exitCode is 0 and no from lines", () => {
    const result = parseFmtCheck("", "Checked 10 files", 0);
    expect(result.total).toBe(0);
    expect(result.files).toBeUndefined();
  });
});

describe("parseFmtWrite — edge cases", () => {
  it("detects formatted .tsx files", () => {
    const stdout = `./src/component.tsx`;
    const result = parseFmtWrite(stdout, "", 0);
    expect(result.total).toBe(1);
    expect(result.files).toEqual(["./src/component.tsx"]);
  });

  it("detects formatted .jsx files", () => {
    const result = parseFmtWrite("./app.jsx", "", 0);
    expect(result.total).toBe(1);
  });

  it("detects formatted .json files", () => {
    const result = parseFmtWrite("./config.json", "", 0);
    expect(result.total).toBe(1);
  });

  it("detects formatted .md files", () => {
    const result = parseFmtWrite("./README.md", "", 0);
    expect(result.total).toBe(1);
  });

  it("ignores Checked and error: lines", () => {
    const result = parseFmtWrite("Checked 5 files\nerror: something\n./a.ts", "", 0);
    expect(result.total).toBe(1);
    expect(result.files).toEqual(["./a.ts"]);
  });

  it("handles failed write mode", () => {
    const result = parseFmtWrite("", "error: permission denied", 1);
    expect(result.success).toBe(false);
    expect(result.mode).toBe("write");
    expect(result.total).toBe(0);
  });
});

describe("parseCheckOutput — edge cases", () => {
  it("parses generic error format (pattern 3)", () => {
    const stderr = `error[E0001]: something went wrong
 --> /project/file.ts:10:5`;

    const result = parseCheckOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors![0].file).toBe("/project/file.ts");
    expect(result.errors![0].line).toBe(10);
    expect(result.errors![0].column).toBe(5);
    expect(result.errors![0].code).toBe("E0001");
    expect(result.errors![0].message).toBe("something went wrong");
  });

  it("parses generic error without code (pattern 3)", () => {
    const stderr = `error: some problem
 at /project/main.ts:3:1`;

    const result = parseCheckOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors![0].code).toBeUndefined();
    expect(result.errors![0].message).toBe("some problem");
  });
});

describe("parseInfoJson — edge cases", () => {
  it("uses roots[0] as module when module param not provided", () => {
    const json = JSON.stringify({
      roots: ["file:///project/main.ts"],
      modules: [{ specifier: "file:///project/main.ts", size: 100 }],
    });

    const result = parseInfoJson(json);

    expect(result.module).toBe("file:///project/main.ts");
  });

  it("handles module without size", () => {
    const json = JSON.stringify({
      modules: [{ specifier: "https://example.com/lib.ts" }],
    });

    const result = parseInfoJson(json);

    expect(result.totalDependencies).toBe(1);
    expect(result.dependencies![0].size).toBeUndefined();
    expect(result.totalSize).toBeUndefined();
  });

  it("handles module with unknown specifier type", () => {
    const json = JSON.stringify({
      modules: [{ specifier: "data:application/json,{}" }],
    });

    const result = parseInfoJson(json);

    expect(result.dependencies![0].type).toBeUndefined();
  });

  it("uses mediaType from first module", () => {
    const json = JSON.stringify({
      modules: [{ specifier: "file:///a.ts", mediaType: "JavaScript", local: "/a.ts" }],
    });

    const result = parseInfoJson(json);

    expect(result.type).toBe("JavaScript");
    expect(result.local).toBe("/a.ts");
  });
});
