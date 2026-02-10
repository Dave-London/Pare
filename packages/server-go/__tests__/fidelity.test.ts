/**
 * Fidelity tests: verify that Pare's Go parsers preserve all meaningful
 * information from raw CLI output.
 *
 * These tests are fixture-based (no Go toolchain required). They feed
 * realistic CLI output into the parsers and assert that the structured
 * result contains every piece of information present in the input.
 */
import { describe, it, expect } from "vitest";
import {
  parseGoBuildOutput,
  parseGoTestJson,
  parseGoVetOutput,
  parseGoRunOutput,
  parseGoModTidyOutput,
  parseGoFmtOutput,
  parseGoGenerateOutput,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// go build
// ---------------------------------------------------------------------------
describe("fidelity: go build", () => {
  it("parses a single error with file, line, column, and message", () => {
    const stderr = "main.go:10:5: undefined: foo";
    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors).toEqual([
      { file: "main.go", line: 10, column: 5, message: "undefined: foo" },
    ]);
  });

  it("parses multiple errors across different files", () => {
    const stderr = [
      "main.go:10:5: undefined: foo",
      "util.go:22:12: cannot use x (variable of type string) as int value in argument",
      "handler.go:45:8: too many arguments in call to process",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.errors[0].file).toBe("main.go");
    expect(result.errors[1].file).toBe("util.go");
    expect(result.errors[2].file).toBe("handler.go");
    expect(result.errors[0].line).toBe(10);
    expect(result.errors[1].line).toBe(22);
    expect(result.errors[2].line).toBe(45);
    expect(result.errors[0].column).toBe(5);
    expect(result.errors[1].column).toBe(12);
    expect(result.errors[2].column).toBe(8);
    expect(result.errors[0].message).toBe("undefined: foo");
    expect(result.errors[1].message).toBe(
      "cannot use x (variable of type string) as int value in argument",
    );
    expect(result.errors[2].message).toBe("too many arguments in call to process");
  });

  it("parses an error without a column number", () => {
    const stderr = "main.go:10: some error";
    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors[0]).toEqual({
      file: "main.go",
      line: 10,
      column: undefined,
      message: "some error",
    });
  });

  it("returns success with no errors for a clean build", () => {
    const result = parseGoBuildOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("parses errors from stdout when stderr is empty", () => {
    // The parser concatenates stdout + stderr, so errors in either stream are found
    const stdout = 'main.go:7:3: imported and not used: "fmt"';
    const result = parseGoBuildOutput(stdout, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors[0]).toEqual({
      file: "main.go",
      line: 7,
      column: 3,
      message: 'imported and not used: "fmt"',
    });
  });

  it("ignores non-matching lines mixed with errors", () => {
    const stderr = [
      "# myapp",
      "main.go:10:5: undefined: foo",
      "some random warning text",
      "util.go:22:12: too few arguments",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors[0].file).toBe("main.go");
    expect(result.errors[1].file).toBe("util.go");
  });
});

// ---------------------------------------------------------------------------
// go test -json
// ---------------------------------------------------------------------------
describe("fidelity: go test", () => {
  it("parses all passing tests", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestAdd" }),
      JSON.stringify({
        Action: "output",
        Package: "myapp",
        Test: "TestAdd",
        Output: "--- PASS: TestAdd (0.00s)\n",
      }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestAdd", Elapsed: 0.001 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestSub" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestSub", Elapsed: 0.002 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestMul" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestMul", Elapsed: 0.003 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.tests.every((t) => t.status === "pass")).toBe(true);
  });

  it("parses a mix of pass, fail, and skip", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestAdd" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestAdd", Elapsed: 0.001 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestSub" }),
      JSON.stringify({ Action: "fail", Package: "myapp", Test: "TestSub", Elapsed: 0.002 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestSkipped" }),
      JSON.stringify({ Action: "skip", Package: "myapp", Test: "TestSkipped", Elapsed: 0 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);

    const passTest = result.tests.find((t) => t.name === "TestAdd");
    const failTest = result.tests.find((t) => t.name === "TestSub");
    const skipTest = result.tests.find((t) => t.name === "TestSkipped");
    expect(passTest?.status).toBe("pass");
    expect(failTest?.status).toBe("fail");
    expect(skipTest?.status).toBe("skip");
  });

  it("preserves elapsed time on each test", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestSlow" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestSlow", Elapsed: 1.234 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestFast" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestFast", Elapsed: 0.001 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.tests[0].elapsed).toBe(1.234);
    expect(result.tests[1].elapsed).toBe(0.001);
  });

  it("filters out package-level events (no Test field)", () => {
    const stdout = [
      JSON.stringify({ Action: "output", Package: "myapp", Output: "ok  \tmyapp\t0.005s\n" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Elapsed: 0.005 }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestOnly" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestOnly", Elapsed: 0.003 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe("TestOnly");
    expect(result.tests[0].package).toBe("myapp");
  });

  it("handles empty output", () => {
    const result = parseGoTestJson("", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.tests).toEqual([]);
  });

  it("handles tests across multiple packages", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp/core", Test: "TestCore" }),
      JSON.stringify({ Action: "pass", Package: "myapp/core", Test: "TestCore", Elapsed: 0.01 }),
      JSON.stringify({ Action: "run", Package: "myapp/util", Test: "TestUtil" }),
      JSON.stringify({ Action: "fail", Package: "myapp/util", Test: "TestUtil", Elapsed: 0.02 }),
      JSON.stringify({ Action: "pass", Package: "myapp/core", Elapsed: 0.5 }),
      JSON.stringify({ Action: "fail", Package: "myapp/util", Elapsed: 0.3 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.total).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);

    const coreTest = result.tests.find((t) => t.package === "myapp/core");
    const utilTest = result.tests.find((t) => t.package === "myapp/util");
    expect(coreTest?.name).toBe("TestCore");
    expect(coreTest?.status).toBe("pass");
    expect(utilTest?.name).toBe("TestUtil");
    expect(utilTest?.status).toBe("fail");
  });

  it("skips malformed JSON lines gracefully", () => {
    const stdout = [
      "not valid json",
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestOk" }),
      "{ broken json",
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestOk", Elapsed: 0.001 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("TestOk");
    expect(result.tests[0].status).toBe("pass");
  });

  it("last terminal action wins for a given test", () => {
    // If a test has both "run" and then "pass", the pass action sets the final state
    // If a test reruns (e.g., via -count), the last action should win
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestRetry" }),
      JSON.stringify({ Action: "fail", Package: "myapp", Test: "TestRetry", Elapsed: 0.01 }),
      // Hypothetical retry scenario: same key overwritten
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestRetry", Elapsed: 0.02 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    // The map overwrites, so last terminal action wins
    expect(result.total).toBe(1);
    expect(result.tests[0].status).toBe("pass");
    expect(result.tests[0].elapsed).toBe(0.02);
  });
});

// ---------------------------------------------------------------------------
// go vet
// ---------------------------------------------------------------------------
describe("fidelity: go vet", () => {
  it("parses a single diagnostic with column", () => {
    const stderr = "main.go:15:2: printf: Sprintf format has extra verb";
    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(1);
    expect(result.diagnostics).toEqual([
      {
        file: "main.go",
        line: 15,
        column: 2,
        message: "printf: Sprintf format has extra verb",
      },
    ]);
  });

  it("parses multiple diagnostics across files", () => {
    const stderr = [
      "main.go:15:2: printf: Sprintf format has extra verb",
      "util.go:30:10: unreachable code",
      "handler.go:8:5: composite literal uses unkeyed fields",
    ].join("\n");

    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(3);
    expect(result.diagnostics[0].file).toBe("main.go");
    expect(result.diagnostics[0].line).toBe(15);
    expect(result.diagnostics[0].column).toBe(2);
    expect(result.diagnostics[0].message).toBe("printf: Sprintf format has extra verb");
    expect(result.diagnostics[1].file).toBe("util.go");
    expect(result.diagnostics[1].line).toBe(30);
    expect(result.diagnostics[1].column).toBe(10);
    expect(result.diagnostics[1].message).toBe("unreachable code");
    expect(result.diagnostics[2].file).toBe("handler.go");
    expect(result.diagnostics[2].line).toBe(8);
    expect(result.diagnostics[2].column).toBe(5);
    expect(result.diagnostics[2].message).toBe("composite literal uses unkeyed fields");
  });

  it("returns empty diagnostics for clean vet output", () => {
    const result = parseGoVetOutput("", "");

    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("parses diagnostic without column number", () => {
    const stderr = "main.go:20: unused variable x";
    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "main.go",
      line: 20,
      column: undefined,
      message: "unused variable x",
    });
  });

  it("ignores non-matching lines in vet output", () => {
    const stderr = [
      "# myapp",
      "main.go:15:2: printf: Sprintf format has extra verb",
      "vet: checking myapp",
      "util.go:30:10: unreachable code",
    ].join("\n");

    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(2);
    expect(result.diagnostics[0].file).toBe("main.go");
    expect(result.diagnostics[1].file).toBe("util.go");
  });

  it("finds diagnostics in stdout when stderr is empty", () => {
    // The parser concatenates stdout + stderr
    const stdout = "main.go:5:1: missing return at end of function";
    const result = parseGoVetOutput(stdout, "");

    expect(result.total).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "main.go",
      line: 5,
      column: 1,
      message: "missing return at end of function",
    });
  });
});

// ---------------------------------------------------------------------------
// go run
// ---------------------------------------------------------------------------
describe("fidelity: go run", () => {
  it("parses successful run with multi-line stdout", () => {
    const stdout = "Hello, World!\nLine 2\nLine 3\n";
    const result = parseGoRunOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!\nLine 2\nLine 3");
    expect(result.stderr).toBe("");
  });

  it("parses failed run with compile error", () => {
    const stderr = [
      "# command-line-arguments",
      "./main.go:5:2: undefined: fmt.Prinln",
    ].join("\n");
    const result = parseGoRunOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("undefined: fmt.Prinln");
    expect(result.stderr).toContain("command-line-arguments");
  });

  it("parses runtime panic with goroutine stack trace", () => {
    const stderr = [
      "goroutine 1 [running]:",
      "main.main()",
      "\t/home/user/project/main.go:12 +0x68",
      "",
      "goroutine 2 [running]:",
      "runtime.goexit()",
      "\t/usr/local/go/src/runtime/asm_amd64.s:1650 +0x1",
    ].join("\n");
    const result = parseGoRunOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("goroutine 1 [running]:");
    expect(result.stderr).toContain("/home/user/project/main.go:12");
    expect(result.stderr).toContain("goroutine 2 [running]:");
  });

  it("preserves stdout and stderr independently", () => {
    const stdout = "output: 42\nresult: ok\n";
    const stderr = "warning: deprecation notice\n";
    const result = parseGoRunOutput(stdout, stderr, 0);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output: 42\nresult: ok");
    expect(result.stderr).toBe("warning: deprecation notice");
  });

  it("trims trailing whitespace from both streams", () => {
    // trimEnd() removes all trailing whitespace (spaces, newlines)
    const result = parseGoRunOutput("hello  \n\n", "  \n", 0);

    expect(result.stdout).toBe("hello");
    expect(result.stderr).toBe("");
  });
});

// ---------------------------------------------------------------------------
// go mod tidy
// ---------------------------------------------------------------------------
describe("fidelity: go mod tidy", () => {
  it("returns clean message when already tidy (no output)", () => {
    const result = parseGoModTidyOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.summary).toBe("go.mod and go.sum are already tidy.");
  });

  it("preserves download messages for added modules", () => {
    const stderr = [
      "go: downloading github.com/stretchr/testify v1.9.0",
      "go: downloading github.com/davecgh/go-spew v1.1.2",
      "go: downloading github.com/pmezard/go-difflib v1.0.1",
    ].join("\n");
    const result = parseGoModTidyOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.summary).toContain("github.com/stretchr/testify v1.9.0");
    expect(result.summary).toContain("github.com/davecgh/go-spew v1.1.2");
    expect(result.summary).toContain("github.com/pmezard/go-difflib v1.0.1");
  });

  it("reports failure when go.mod is missing", () => {
    const stderr =
      "go: go.mod file not found in current directory or any parent directory; see 'go help modules'\n";
    const result = parseGoModTidyOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.summary).toContain("go.mod file not found");
  });

  it("reports failure with dependency resolution conflict", () => {
    const stderr = [
      "go: example.com/foo@v1.2.3 requires",
      "\texample.com/bar@v2.0.0: version \"v2.0.0\" invalid: unknown revision v2.0.0",
    ].join("\n");
    const result = parseGoModTidyOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.summary).toContain("example.com/foo@v1.2.3");
    expect(result.summary).toContain("unknown revision v2.0.0");
  });

  it("preserves output from stdout when present", () => {
    const stdout = "go: finding module for package github.com/pkg/errors\n";
    const result = parseGoModTidyOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.summary).toContain("github.com/pkg/errors");
  });
});

// ---------------------------------------------------------------------------
// gofmt
// ---------------------------------------------------------------------------
describe("fidelity: gofmt", () => {
  it("lists unformatted files in check mode (-l)", () => {
    const stdout = [
      "main.go",
      "cmd/server/handler.go",
      "internal/util/helpers.go",
    ].join("\n") + "\n";

    const result = parseGoFmtOutput(stdout, "", 0, true);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(3);
    expect(result.files).toEqual([
      "main.go",
      "cmd/server/handler.go",
      "internal/util/helpers.go",
    ]);
  });

  it("returns success when no files need formatting (check mode)", () => {
    const result = parseGoFmtOutput("", "", 0, true);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("returns success with empty output in fix mode (-w)", () => {
    // gofmt -w rewrites files in place, producing no stdout
    const result = parseGoFmtOutput("", "", 0, false);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("reports failure on syntax error in check mode", () => {
    const stderr = "main.go:10:1: expected declaration, got '}'";
    const result = parseGoFmtOutput("", stderr, 2, true);

    expect(result.success).toBe(false);
  });

  it("handles deeply nested paths", () => {
    const stdout = "pkg/internal/middleware/auth/jwt/token_validator.go\n";
    const result = parseGoFmtOutput(stdout, "", 0, true);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(1);
    expect(result.files[0]).toBe("pkg/internal/middleware/auth/jwt/token_validator.go");
  });
});

// ---------------------------------------------------------------------------
// go generate
// ---------------------------------------------------------------------------
describe("fidelity: go generate", () => {
  it("parses successful generate with no output", () => {
    const result = parseGoGenerateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toBe("");
  });

  it("preserves generator stdout output", () => {
    const stdout = [
      "mockgen -source=service.go -destination=mock_service.go",
      "stringer -type=Color",
    ].join("\n") + "\n";
    const result = parseGoGenerateOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("mockgen -source=service.go");
    expect(result.output).toContain("stringer -type=Color");
  });

  it("preserves failure output with missing generator", () => {
    const stderr =
      'main.go:3: running "mockgen": exec: "mockgen": executable file not found in $PATH\n';
    const result = parseGoGenerateOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.output).toContain("mockgen");
    expect(result.output).toContain("executable file not found");
  });

  it("combines stdout and stderr in output", () => {
    const stdout = "generating code for service.go\n";
    const stderr = "warning: deprecated directive format\n";
    const result = parseGoGenerateOutput(stdout, stderr, 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("generating code for service.go");
    expect(result.output).toContain("warning: deprecated directive format");
  });

  it("parses generate failure with bad directive syntax", () => {
    const stderr = [
      "main.go:3: bad flag syntax in //go:generate directive",
      "types.go:7: invalid go:generate directive",
    ].join("\n") + "\n";
    const result = parseGoGenerateOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.output).toContain("bad flag syntax");
    expect(result.output).toContain("invalid go:generate directive");
  });
});
