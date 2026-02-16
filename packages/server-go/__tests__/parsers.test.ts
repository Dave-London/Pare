import { describe, it, expect } from "vitest";
import {
  parseGoBuildOutput,
  parseGoTestJson,
  parseGoVetOutput,
  parseGoEnvOutput,
  parseGoListOutput,
  parseGoGetOutput,
  parseGolangciLintJson,
} from "../src/lib/parsers.js";

describe("parseGoBuildOutput", () => {
  it("parses build errors", () => {
    const stderr = [
      "main.go:10:5: undefined: foo",
      "main.go:15: cannot use x (type string) as type int",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors[0]).toEqual({
      file: "main.go",
      line: 10,
      column: 5,
      message: "undefined: foo",
    });
    expect(result.errors[1].column).toBeUndefined();
  });

  it("parses clean build", () => {
    const result = parseGoBuildOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe("parseGoTestJson", () => {
  it("parses test JSON output", () => {
    const stdout = [
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "run",
        Package: "myapp",
        Test: "TestAdd",
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "output",
        Package: "myapp",
        Test: "TestAdd",
        Output: "--- PASS: TestAdd (0.00s)\n",
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "pass",
        Package: "myapp",
        Test: "TestAdd",
        Elapsed: 0.001,
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "run",
        Package: "myapp",
        Test: "TestSub",
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "fail",
        Package: "myapp",
        Test: "TestSub",
        Elapsed: 0.002,
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "run",
        Package: "myapp",
        Test: "TestSkipped",
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "skip",
        Package: "myapp",
        Test: "TestSkipped",
        Elapsed: 0,
      }),
      JSON.stringify({
        Time: "2024-01-01T00:00:00Z",
        Action: "fail",
        Package: "myapp",
        Elapsed: 0.5,
      }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.tests[0]).toEqual({
      package: "myapp",
      name: "TestAdd",
      status: "pass",
      elapsed: 0.001,
    });
  });

  it("parses all passing", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestA" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestA", Elapsed: 0.01 }),
      JSON.stringify({ Action: "pass", Package: "myapp", Elapsed: 0.5 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseGoTestJson("", 0);
    expect(result.total).toBe(0);
  });

  it("ignores package-level events without Test field", () => {
    const stdout = [
      JSON.stringify({ Action: "output", Package: "myapp", Output: "ok  \tmyapp\t0.005s\n" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Elapsed: 0.005 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);
    expect(result.total).toBe(0);
  });
});

describe("parseGoVetOutput", () => {
  it("parses vet diagnostics", () => {
    const stderr = [
      "main.go:10:5: printf call has arguments but no formatting directives",
      "utils.go:20: unreachable code",
    ].join("\n");

    const result = parseGoVetOutput("", stderr, 2);

    expect(result.total).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "main.go",
      line: 10,
      column: 5,
      message: "printf call has arguments but no formatting directives",
    });
  });

  it("parses clean vet", () => {
    const result = parseGoVetOutput("", "", 0);
    expect(result.total).toBe(0);
  });
});

describe("parseGoEnvOutput", () => {
  it("parses go env -json output with key fields", () => {
    const stdout = JSON.stringify({
      GOROOT: "/usr/local/go",
      GOPATH: "/home/user/go",
      GOVERSION: "go1.22.0",
      GOOS: "linux",
      GOARCH: "amd64",
      CGO_ENABLED: "1",
    });

    const result = parseGoEnvOutput(stdout);

    expect(result.success).toBe(true);
    expect(result.goroot).toBe("/usr/local/go");
    expect(result.gopath).toBe("/home/user/go");
    expect(result.goversion).toBe("go1.22.0");
    expect(result.goos).toBe("linux");
    expect(result.goarch).toBe("amd64");
    expect(result.vars!.CGO_ENABLED).toBe("1");
    expect(result.vars!.GOROOT).toBe("/usr/local/go");
  });

  it("handles empty output", () => {
    const result = parseGoEnvOutput("{}");

    expect(result.goroot).toBe("");
    expect(result.gopath).toBe("");
    expect(result.goversion).toBe("");
    expect(result.goos).toBe("");
    expect(result.goarch).toBe("");
  });

  it("parses specific variable output", () => {
    const stdout = JSON.stringify({
      GOROOT: "/usr/local/go",
      GOPATH: "/home/user/go",
    });

    const result = parseGoEnvOutput(stdout);

    expect(result.goroot).toBe("/usr/local/go");
    expect(result.gopath).toBe("/home/user/go");
    expect(result.goversion).toBe("");
  });
});

describe("parseGoListOutput", () => {
  it("parses single package", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go", "util.go"],
    });

    const result = parseGoListOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.packages[0]).toEqual({
      dir: "/home/user/project",
      importPath: "github.com/user/project",
      name: "main",
      goFiles: ["main.go", "util.go"],
    });
  });

  it("parses multiple packages (JSONL)", () => {
    const pkg1 = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go"],
    });
    const pkg2 = JSON.stringify({
      Dir: "/home/user/project/pkg/util",
      ImportPath: "github.com/user/project/pkg/util",
      Name: "util",
      GoFiles: ["util.go", "helpers.go"],
    });
    const stdout = pkg1 + "\n" + pkg2;

    const result = parseGoListOutput(stdout, 0);

    expect(result.total).toBe(2);
    expect(result.packages[0].importPath).toBe("github.com/user/project");
    expect(result.packages[1].importPath).toBe("github.com/user/project/pkg/util");
    expect(result.packages[1].name).toBe("util");
  });

  it("handles empty output", () => {
    const result = parseGoListOutput("", 0);

    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles package without GoFiles", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
    });

    const result = parseGoListOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.packages[0].goFiles).toBeUndefined();
  });
});

describe("parseGoGetOutput", () => {
  it("parses successful go get", () => {
    const stderr = "go: downloading github.com/pkg/errors v0.9.1\n";
    const result = parseGoGetOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("github.com/pkg/errors");
  });

  it("parses failed go get", () => {
    const stderr =
      'go: module github.com/nonexistent/pkg: no matching versions for query "latest"\n';
    const result = parseGoGetOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.output).toContain("no matching versions");
  });

  it("handles empty output on success", () => {
    const result = parseGoGetOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toBeUndefined();
  });
});

describe("parseGolangciLintJson", () => {
  it("parses JSON output with multiple issues", () => {
    const stdout = JSON.stringify({
      Issues: [
        {
          FromLinter: "govet",
          Text: "printf: Sprintf format %d reads arg #1, but call has 0 args",
          Severity: "warning",
          Pos: { Filename: "main.go", Line: 10, Column: 5 },
          SourceLines: ['\tfmt.Sprintf("%d")'],
        },
        {
          FromLinter: "errcheck",
          Text: "Error return value is not checked",
          Severity: "error",
          Pos: { Filename: "handler.go", Line: 25, Column: 0 },
          SourceLines: ["\tos.Remove(path)"],
        },
        {
          FromLinter: "govet",
          Text: "unreachable code",
          Severity: "warning",
          Pos: { Filename: "util.go", Line: 42 },
        },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(2);
    expect(result.diagnostics).toHaveLength(3);

    expect(result.diagnostics![0]).toEqual({
      file: "main.go",
      line: 10,
      column: 5,
      linter: "govet",
      severity: "warning",
      message: "printf: Sprintf format %d reads arg #1, but call has 0 args",
      sourceLine: '\tfmt.Sprintf("%d")',
    });

    expect(result.diagnostics![1]).toEqual({
      file: "handler.go",
      line: 25,
      column: undefined,
      linter: "errcheck",
      severity: "error",
      message: "Error return value is not checked",
      sourceLine: "\tos.Remove(path)",
    });

    expect(result.diagnostics![2].sourceLine).toBeUndefined();
  });

  it("parses clean output with no issues", () => {
    const stdout = JSON.stringify({ Issues: [] });
    const result = parseGolangciLintJson(stdout, 0);

    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.byLinter).toEqual([]);
  });

  it("handles empty stdout", () => {
    const result = parseGolangciLintJson("", 0);

    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
  });

  it("handles malformed JSON", () => {
    const result = parseGolangciLintJson("not valid json", 1);

    expect(result.total).toBe(0);
  });

  it("builds by-linter summary sorted by count", () => {
    const stdout = JSON.stringify({
      Issues: [
        { FromLinter: "errcheck", Text: "err1", Pos: { Filename: "a.go", Line: 1 } },
        { FromLinter: "govet", Text: "vet1", Pos: { Filename: "a.go", Line: 2 } },
        { FromLinter: "errcheck", Text: "err2", Pos: { Filename: "b.go", Line: 3 } },
        { FromLinter: "errcheck", Text: "err3", Pos: { Filename: "c.go", Line: 4 } },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.byLinter).toEqual([
      { linter: "errcheck", count: 3 },
      { linter: "govet", count: 1 },
    ]);
  });

  it("defaults severity to warning when not specified", () => {
    const stdout = JSON.stringify({
      Issues: [{ FromLinter: "govet", Text: "issue", Pos: { Filename: "a.go", Line: 1 } }],
    });

    const result = parseGolangciLintJson(stdout, 1);
    expect(result.diagnostics![0].severity).toBe("warning");
    expect(result.warnings).toBe(1);
  });

  it("handles null Issues field", () => {
    const stdout = JSON.stringify({ Report: {} });
    const result = parseGolangciLintJson(stdout, 0);

    expect(result.total).toBe(0);
  });
});
