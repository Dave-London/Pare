import { describe, it, expect } from "vitest";
import {
  parseGoBuildOutput,
  parseGoTestJson,
  parseGoVetOutput,
  parseGoEnvOutput,
  parseGoListOutput,
  parseGoListModulesOutput,
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

  it("captures package-level errors not matching file:line:col format", () => {
    const stderr = [
      "# myapp",
      "package myapp/internal/foo is not in GOROOT (/usr/local/go/src/myapp/internal/foo)",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.rawErrors).toBeDefined();
    expect(result.rawErrors).toHaveLength(1);
    expect(result.rawErrors![0]).toContain("is not in GOROOT");
    expect(result.total).toBe(1);
  });

  it("captures linker errors", () => {
    const stderr = [
      "# myapp",
      "/usr/bin/ld: cannot find -lmylib",
      "main.go:10:5: undefined: foo",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.rawErrors).toBeDefined();
    expect(result.rawErrors).toHaveLength(1);
    expect(result.rawErrors![0]).toContain("cannot find -lmylib");
    expect(result.total).toBe(2);
  });

  it("captures build constraint errors", () => {
    const stderr = "build constraints exclude all Go files in /home/user/project/pkg";

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.rawErrors).toHaveLength(1);
    expect(result.rawErrors![0]).toContain("build constraints exclude all Go files");
    expect(result.total).toBe(1);
  });

  it("captures module errors starting with go:", () => {
    const stderr = "go: cannot find main module, but found .git/config in /home/user/project";

    const result = parseGoBuildOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.rawErrors).toHaveLength(1);
    expect(result.rawErrors![0]).toContain("cannot find main module");
    expect(result.total).toBe(1);
  });

  it("does not capture non-file errors on successful build", () => {
    // Some lines like "go: downloading..." appear on success too; they should not be errors
    const stderr = "go: downloading github.com/pkg/errors v0.9.1";

    const result = parseGoBuildOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.rawErrors).toBeUndefined();
    expect(result.total).toBe(0);
  });

  it("counts both file errors and raw errors in total", () => {
    const stderr = [
      "main.go:10:5: undefined: foo",
      "package myapp/missing is not in GOROOT (/usr/local/go/src/myapp/missing)",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.errors).toHaveLength(1);
    expect(result.rawErrors).toHaveLength(1);
    expect(result.total).toBe(2);
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

  it("ignores package-level pass events without Test field", () => {
    const stdout = [
      JSON.stringify({ Action: "output", Package: "myapp", Output: "ok  \tmyapp\t0.005s\n" }),
      JSON.stringify({ Action: "pass", Package: "myapp", Elapsed: 0.005 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);
    expect(result.total).toBe(0);
    expect(result.packageFailures).toBeUndefined();
  });

  it("captures output for failed tests (#51)", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestFail" }),
      JSON.stringify({
        Action: "output",
        Package: "myapp",
        Test: "TestFail",
        Output: "    main_test.go:10: expected 42, got 0\n",
      }),
      JSON.stringify({
        Action: "output",
        Package: "myapp",
        Test: "TestFail",
        Output: "--- FAIL: TestFail (0.00s)\n",
      }),
      JSON.stringify({ Action: "fail", Package: "myapp", Test: "TestFail", Elapsed: 0.001 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.failed).toBe(1);
    const failedTest = result.tests.find((t) => t.name === "TestFail");
    expect(failedTest).toBeDefined();
    expect(failedTest!.output).toBeDefined();
    expect(failedTest!.output).toContain("expected 42, got 0");
    expect(failedTest!.output).toContain("FAIL: TestFail");
  });

  it("does not populate output for passing tests (#51)", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestPass" }),
      JSON.stringify({
        Action: "output",
        Package: "myapp",
        Test: "TestPass",
        Output: "--- PASS: TestPass (0.00s)\n",
      }),
      JSON.stringify({ Action: "pass", Package: "myapp", Test: "TestPass", Elapsed: 0.001 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    const passingTest = result.tests.find((t) => t.name === "TestPass");
    expect(passingTest).toBeDefined();
    expect(passingTest!.output).toBeUndefined();
  });

  it("captures package-level failures without test events (#52)", () => {
    const stdout = [
      JSON.stringify({
        Action: "output",
        Package: "myapp/broken",
        Output: "# myapp/broken\n",
      }),
      JSON.stringify({
        Action: "output",
        Package: "myapp/broken",
        Output: "./main.go:5:2: undefined: missingFunc\n",
      }),
      JSON.stringify({ Action: "fail", Package: "myapp/broken", Elapsed: 0.1 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.packageFailures).toBeDefined();
    expect(result.packageFailures).toHaveLength(1);
    expect(result.packageFailures![0].package).toBe("myapp/broken");
    expect(result.packageFailures![0].output).toContain("undefined: missingFunc");
  });

  it("does not include package failures when package has tests (#52)", () => {
    // A package that has both test results and a package-level "fail" event
    // is just the test runner summary, not a build failure
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestSomething" }),
      JSON.stringify({ Action: "fail", Package: "myapp", Test: "TestSomething", Elapsed: 0.01 }),
      JSON.stringify({ Action: "output", Package: "myapp", Output: "FAIL\tmyapp\t0.01s\n" }),
      JSON.stringify({ Action: "fail", Package: "myapp", Elapsed: 0.01 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.failed).toBe(1);
    expect(result.packageFailures).toBeUndefined();
  });
});

describe("parseGoVetOutput", () => {
  it("parses vet diagnostics from text output (fallback)", () => {
    const stderr = [
      "main.go:10:5: printf call has arguments but no formatting directives",
      "utils.go:20: unreachable code",
    ].join("\n");

    const result = parseGoVetOutput("", stderr, 2);

    expect(result.total).toBe(2);
    expect(result.diagnostics![0]).toEqual({
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

  it("parses go vet -json output with analyzer names", () => {
    const stdout = JSON.stringify({
      "myapp/pkg": {
        printf: {
          posn: "main.go:10:5",
          message: "Sprintf format %d reads arg #1, but call has 0 args",
        },
        unusedresult: {
          posn: "util.go:20:3",
          message: "result of fmt.Sprintf call not used",
        },
      },
    });

    const result = parseGoVetOutput(stdout, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.diagnostics![0]).toEqual({
      file: "main.go",
      line: 10,
      column: 5,
      message: "Sprintf format %d reads arg #1, but call has 0 args",
      analyzer: "printf",
    });
    expect(result.diagnostics![1]).toEqual({
      file: "util.go",
      line: 20,
      column: 3,
      message: "result of fmt.Sprintf call not used",
      analyzer: "unusedresult",
    });
  });

  it("parses go vet -json output with multiple packages", () => {
    const pkg1 = JSON.stringify({
      "myapp/api": {
        shadow: {
          posn: "handler.go:15:4",
          message: 'declaration of "err" shadows declaration',
        },
      },
    });
    const pkg2 = JSON.stringify({
      "myapp/util": {
        printf: {
          posn: "format.go:30:2",
          message: "Sprintf format %s reads arg #1, but call has 0 args",
        },
      },
    });

    const result = parseGoVetOutput(pkg1 + "\n" + pkg2, "", 2);

    expect(result.total).toBe(2);
    expect(result.diagnostics![0].analyzer).toBe("shadow");
    expect(result.diagnostics![0].file).toBe("handler.go");
    expect(result.diagnostics![1].analyzer).toBe("printf");
    expect(result.diagnostics![1].file).toBe("format.go");
  });

  it("parses go vet -json with array of diagnostics per analyzer", () => {
    const stdout = JSON.stringify({
      "myapp/pkg": {
        printf: [
          { posn: "main.go:10:5", message: "first printf issue" },
          { posn: "main.go:20:3", message: "second printf issue" },
        ],
      },
    });

    const result = parseGoVetOutput(stdout, "", 2);

    expect(result.total).toBe(2);
    expect(result.diagnostics![0].analyzer).toBe("printf");
    expect(result.diagnostics![0].message).toBe("first printf issue");
    expect(result.diagnostics![1].analyzer).toBe("printf");
    expect(result.diagnostics![1].message).toBe("second printf issue");
  });

  it("falls back to text parsing when JSON parsing fails", () => {
    // Non-JSON vet output (older Go or -json not supported)
    const stderr = "main.go:10:5: unreachable code\nutils.go:20: bad format string";

    const result = parseGoVetOutput("", stderr, 2);

    expect(result.total).toBe(2);
    expect(result.diagnostics![0].file).toBe("main.go");
    expect(result.diagnostics![0].line).toBe(10);
    // No analyzer in text fallback
    expect(result.diagnostics![0].analyzer).toBeUndefined();
  });

  it("parses go vet -json with posn without column", () => {
    const stdout = JSON.stringify({
      "myapp/pkg": {
        unreachable: {
          posn: "main.go:42",
          message: "unreachable code",
        },
      },
    });

    const result = parseGoVetOutput(stdout, "", 2);

    expect(result.total).toBe(1);
    expect(result.diagnostics![0].file).toBe("main.go");
    expect(result.diagnostics![0].line).toBe(42);
    expect(result.diagnostics![0].column).toBeUndefined();
    expect(result.diagnostics![0].analyzer).toBe("unreachable");
  });

  it("parses go vet -json clean output (exit 0, no JSON)", () => {
    const result = parseGoVetOutput("", "", 0);
    expect(result.success).toBe(true);
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
    expect(result.packages![0]).toEqual({
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
    expect(result.packages![0].importPath).toBe("github.com/user/project");
    expect(result.packages![1].importPath).toBe("github.com/user/project/pkg/util");
    expect(result.packages![1].name).toBe("util");
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
    expect(result.packages![0].goFiles).toBeUndefined();
  });

  it("captures Imports field from go list -json output", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go"],
      Imports: ["fmt", "os", "github.com/user/project/pkg/util"],
    });

    const result = parseGoListOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.packages![0].imports).toEqual(["fmt", "os", "github.com/user/project/pkg/util"]);
  });

  it("handles package without Imports field", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go"],
    });

    const result = parseGoListOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.packages![0].imports).toBeUndefined();
  });
});

describe("parseGoListModulesOutput", () => {
  it("parses single module", () => {
    const stdout = JSON.stringify({
      Path: "github.com/user/project",
      Main: true,
      Dir: "/home/user/project",
      GoMod: "/home/user/project/go.mod",
      GoVersion: "1.22",
    });

    const result = parseGoListModulesOutput(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.modules![0]).toEqual({
      path: "github.com/user/project",
      main: true,
      dir: "/home/user/project",
      goMod: "/home/user/project/go.mod",
      goVersion: "1.22",
    });
  });

  it("parses multiple modules (JSONL)", () => {
    const mod1 = JSON.stringify({
      Path: "github.com/user/project",
      Main: true,
      Dir: "/home/user/project",
      GoMod: "/home/user/project/go.mod",
      GoVersion: "1.22",
    });
    const mod2 = JSON.stringify({
      Path: "github.com/pkg/errors",
      Version: "v0.9.1",
      Dir: "/home/user/go/pkg/mod/github.com/pkg/errors@v0.9.1",
      GoMod: "/home/user/go/pkg/mod/cache/download/github.com/pkg/errors/@v/v0.9.1.mod",
      GoVersion: "1.12",
    });
    const mod3 = JSON.stringify({
      Path: "golang.org/x/text",
      Version: "v0.14.0",
      Indirect: true,
    });

    const result = parseGoListModulesOutput([mod1, mod2, mod3].join("\n"), 0);

    expect(result.total).toBe(3);
    expect(result.modules![0].path).toBe("github.com/user/project");
    expect(result.modules![0].main).toBe(true);
    expect(result.modules![1].path).toBe("github.com/pkg/errors");
    expect(result.modules![1].version).toBe("v0.9.1");
    expect(result.modules![2].path).toBe("golang.org/x/text");
    expect(result.modules![2].indirect).toBe(true);
  });

  it("handles empty output", () => {
    const result = parseGoListModulesOutput("", 0);

    expect(result.total).toBe(0);
    expect(result.modules).toEqual([]);
  });

  it("handles module without version (main module)", () => {
    const stdout = JSON.stringify({
      Path: "github.com/user/project",
      Main: true,
      Dir: "/home/user/project",
    });

    const result = parseGoListModulesOutput(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.modules![0].version).toBeUndefined();
    expect(result.modules![0].main).toBe(true);
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

  it("parses upgraded packages with version resolution", () => {
    const stderr = [
      "go: upgraded golang.org/x/text v0.3.7 => v0.14.0",
      "go: upgraded golang.org/x/net v0.8.0 => v0.10.0",
    ].join("\n");

    const result = parseGoGetOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.resolvedPackages).toBeDefined();
    expect(result.resolvedPackages).toHaveLength(2);
    expect(result.resolvedPackages![0]).toEqual({
      package: "golang.org/x/text",
      previousVersion: "v0.3.7",
      newVersion: "v0.14.0",
    });
    expect(result.resolvedPackages![1]).toEqual({
      package: "golang.org/x/net",
      previousVersion: "v0.8.0",
      newVersion: "v0.10.0",
    });
  });

  it("parses added packages (no previous version)", () => {
    const stderr = "go: added github.com/pkg/errors v0.9.1\n";

    const result = parseGoGetOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.resolvedPackages).toBeDefined();
    expect(result.resolvedPackages).toHaveLength(1);
    expect(result.resolvedPackages![0]).toEqual({
      package: "github.com/pkg/errors",
      newVersion: "v0.9.1",
    });
    expect(result.resolvedPackages![0].previousVersion).toBeUndefined();
  });

  it("parses downgraded packages", () => {
    const stderr = "go: downgraded golang.org/x/net v0.10.0 => v0.8.0\n";

    const result = parseGoGetOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.resolvedPackages).toHaveLength(1);
    expect(result.resolvedPackages![0]).toEqual({
      package: "golang.org/x/net",
      previousVersion: "v0.10.0",
      newVersion: "v0.8.0",
    });
  });

  it("parses mixed added and upgraded packages", () => {
    const stderr = [
      "go: downloading github.com/pkg/errors v0.9.1",
      "go: added github.com/pkg/errors v0.9.1",
      "go: upgraded golang.org/x/text v0.3.7 => v0.14.0",
    ].join("\n");

    const result = parseGoGetOutput("", stderr, 0);

    expect(result.resolvedPackages).toHaveLength(2);
    expect(result.resolvedPackages![0].package).toBe("github.com/pkg/errors");
    expect(result.resolvedPackages![0].previousVersion).toBeUndefined();
    expect(result.resolvedPackages![1].package).toBe("golang.org/x/text");
    expect(result.resolvedPackages![1].previousVersion).toBe("v0.3.7");
  });

  it("returns no resolvedPackages when output has no version lines", () => {
    const stderr = "go: downloading github.com/pkg/errors v0.9.1\n";

    const result = parseGoGetOutput("", stderr, 0);

    expect(result.resolvedPackages).toBeUndefined();
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

// ─── Gap #151: fmt parse errors ─────────────────────────────────────
import { parseGoFmtOutput } from "../src/lib/parsers.js";

describe("parseGoFmtOutput — stderr parse errors (Gap #151)", () => {
  it("captures parse errors from stderr", () => {
    const stderr = [
      "main.go:5:1: expected declaration, got '}'",
      "util.go:10:3: expected ';', found 'IDENT'",
    ].join("\n");
    const result = parseGoFmtOutput("", stderr, 2, true);

    expect(result.success).toBe(false);
    expect(result.parseErrors).toBeDefined();
    expect(result.parseErrors).toHaveLength(2);
    expect(result.parseErrors![0]).toEqual({
      file: "main.go",
      line: 5,
      column: 1,
      message: "expected declaration, got '}'",
    });
    expect(result.parseErrors![1]).toEqual({
      file: "util.go",
      line: 10,
      column: 3,
      message: "expected ';', found 'IDENT'",
    });
  });

  it("captures parse error without column", () => {
    const stderr = "main.go:5: expected declaration, got '}'";
    const result = parseGoFmtOutput("", stderr, 2, false);

    expect(result.parseErrors).toBeDefined();
    expect(result.parseErrors).toHaveLength(1);
    expect(result.parseErrors![0].column).toBeUndefined();
  });

  it("returns no parseErrors when stderr is empty", () => {
    const result = parseGoFmtOutput("main.go\n", "", 0, true);
    expect(result.parseErrors).toBeUndefined();
  });

  it("returns both files and parseErrors when both exist", () => {
    const stdout = "main.go\n";
    const stderr = "broken.go:1:1: expected package, found 'EOF'";
    const result = parseGoFmtOutput(stdout, stderr, 2, true);

    expect(result.filesChanged).toBe(1);
    expect(result.files).toEqual(["main.go"]);
    expect(result.parseErrors).toHaveLength(1);
    expect(result.parseErrors![0].file).toBe("broken.go");
  });
});

// ─── Gap #152: generate directives ──────────────────────────────────
import { parseGoGenerateOutput } from "../src/lib/parsers.js";

describe("parseGoGenerateOutput — per-directive parsing (Gap #152)", () => {
  it("parses -v verbose output with running directives", () => {
    const stderr = ['main.go:3: running "stringer"', 'types.go:10: running "mockgen"'].join("\n");
    const result = parseGoGenerateOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.directives).toBeDefined();
    expect(result.directives).toHaveLength(2);
    expect(result.directives![0]).toEqual({
      file: "main.go",
      line: 3,
      command: "stringer",
      status: "completed",
    });
    expect(result.directives![1]).toEqual({
      file: "types.go",
      line: 10,
      command: "mockgen",
      status: "completed",
    });
  });

  it("parses -x output with file:line: command format", () => {
    const stderr = ["main.go:3: stringer -type=Pill", "types.go:10: mockgen -source=svc.go"].join(
      "\n",
    );
    const result = parseGoGenerateOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.directives).toBeDefined();
    expect(result.directives).toHaveLength(2);
    expect(result.directives![0].command).toBe("stringer -type=Pill");
    expect(result.directives![1].command).toBe("mockgen -source=svc.go");
  });

  it("returns no directives when no -v/-x output", () => {
    const result = parseGoGenerateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.directives).toBeUndefined();
  });

  it("parses failed generate with directives", () => {
    const stderr = 'main.go:3: running "stringer"';
    const result = parseGoGenerateOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.directives).toBeDefined();
    expect(result.directives).toHaveLength(1);
    expect(result.directives![0].status).toBe("running");
  });
});

// ─── Gap #153: go get per-package status ────────────────────────────

describe("parseGoGetOutput — per-package status (Gap #153)", () => {
  it("tracks per-package status for successful adds", () => {
    const stderr = [
      "go: added github.com/pkg/errors v0.9.1",
      "go: upgraded golang.org/x/text v0.3.7 => v0.14.0",
    ].join("\n");

    const result = parseGoGetOutput("", stderr, 0, [
      "github.com/pkg/errors@latest",
      "golang.org/x/text@latest",
    ]);

    expect(result.packages).toBeDefined();
    expect(result.packages).toHaveLength(2);

    const pkgErrors = result.packages!.find((p) => p.path === "github.com/pkg/errors");
    expect(pkgErrors).toBeDefined();
    expect(pkgErrors!.version).toBe("v0.9.1");
    expect(pkgErrors!.error).toBeUndefined();

    const pkgText = result.packages!.find((p) => p.path === "golang.org/x/text");
    expect(pkgText).toBeDefined();
    expect(pkgText!.version).toBe("v0.14.0");
  });

  it("tracks per-package errors", () => {
    const stderr = 'go: module github.com/nonexistent/pkg: no matching versions for query "latest"';

    const result = parseGoGetOutput("", stderr, 1, ["github.com/nonexistent/pkg@latest"]);

    expect(result.success).toBe(false);
    expect(result.packages).toBeDefined();
    expect(result.packages!.length).toBeGreaterThanOrEqual(1);

    const failedPkg = result.packages!.find((p) => p.path === "github.com/nonexistent/pkg");
    expect(failedPkg).toBeDefined();
    expect(failedPkg!.error).toContain("no matching versions");
  });

  it("returns no packages when no requestedPackages provided and no output", () => {
    const result = parseGoGetOutput("", "", 0);

    expect(result.packages).toBeUndefined();
  });

  it("marks requested packages as successful when exit 0 and no explicit output", () => {
    const result = parseGoGetOutput("", "", 0, ["github.com/pkg/errors@v0.9.1"]);

    expect(result.packages).toBeDefined();
    expect(result.packages).toHaveLength(1);
    expect(result.packages![0].path).toBe("github.com/pkg/errors");
    expect(result.packages![0].error).toBeUndefined();
  });
});

// ─── Gap #154: golangci-lint Replacement data ───────────────────────

describe("parseGolangciLintJson — Replacement/fix data (Gap #154)", () => {
  it("captures Replacement with NewLines", () => {
    const stdout = JSON.stringify({
      Issues: [
        {
          FromLinter: "gofmt",
          Text: "file is not gofmtted",
          Pos: { Filename: "main.go", Line: 10, Column: 5 },
          Replacement: {
            NewLines: ["  fmt.Println(x)", "  return nil"],
          },
        },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics![0].fix).toBeDefined();
    expect(result.diagnostics![0].fix!.text).toBe("  fmt.Println(x)\n  return nil");
  });

  it("captures Replacement with NeedOnlyDelete", () => {
    const stdout = JSON.stringify({
      Issues: [
        {
          FromLinter: "unused",
          Text: "unused variable",
          Pos: { Filename: "main.go", Line: 5, Column: 2 },
          Replacement: {
            NeedOnlyDelete: true,
          },
        },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics![0].fix).toBeDefined();
    expect(result.diagnostics![0].fix!.text).toBe("");
  });

  it("captures Replacement with Inline range info", () => {
    const stdout = JSON.stringify({
      Issues: [
        {
          FromLinter: "gocritic",
          Text: "use strings.ReplaceAll",
          Pos: { Filename: "util.go", Line: 15, Column: 3 },
          Replacement: {
            NewLines: ['strings.ReplaceAll(s, "a", "b")'],
            Inline: {
              StartLine: 15,
              StartCol: 3,
              EndLine: 15,
              EndCol: 35,
            },
          },
        },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.diagnostics![0].fix).toBeDefined();
    expect(result.diagnostics![0].fix!.text).toBe('strings.ReplaceAll(s, "a", "b")');
    expect(result.diagnostics![0].fix!.range).toEqual({
      start: { line: 15, column: 3 },
      end: { line: 15, column: 35 },
    });
  });

  it("does not include fix when no Replacement present", () => {
    const stdout = JSON.stringify({
      Issues: [
        {
          FromLinter: "govet",
          Text: "unreachable code",
          Pos: { Filename: "main.go", Line: 10 },
        },
      ],
    });

    const result = parseGolangciLintJson(stdout, 1);

    expect(result.diagnostics![0].fix).toBeUndefined();
  });
});

// ─── Gap #155: go list Error field ──────────────────────────────────

describe("parseGoListOutput — Error field (Gap #155)", () => {
  it("captures Error field per package", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go"],
      Error: { Err: "build constraints exclude all Go files in /home/user/project" },
    });

    const result = parseGoListOutput(stdout, 1);

    expect(result.total).toBe(1);
    expect(result.packages![0].error).toBeDefined();
    expect(result.packages![0].error!.err).toBe(
      "build constraints exclude all Go files in /home/user/project",
    );
  });

  it("does not include error when Error is absent", () => {
    const stdout = JSON.stringify({
      Dir: "/home/user/project",
      ImportPath: "github.com/user/project",
      Name: "main",
      GoFiles: ["main.go"],
    });

    const result = parseGoListOutput(stdout, 0);

    expect(result.packages![0].error).toBeUndefined();
  });

  it("captures Error field across multiple packages", () => {
    const pkg1 = JSON.stringify({
      Dir: "/project/ok",
      ImportPath: "github.com/user/project/ok",
      Name: "ok",
    });
    const pkg2 = JSON.stringify({
      Dir: "/project/broken",
      ImportPath: "github.com/user/project/broken",
      Name: "broken",
      Error: { Err: "no Go files in /project/broken" },
    });

    const result = parseGoListOutput(pkg1 + "\n" + pkg2, 1);

    expect(result.total).toBe(2);
    expect(result.packages![0].error).toBeUndefined();
    expect(result.packages![1].error).toBeDefined();
    expect(result.packages![1].error!.err).toBe("no Go files in /project/broken");
  });
});

// ─── Gap #156: mod-tidy madeChanges ─────────────────────────────────
import { parseGoModTidyOutput } from "../src/lib/parsers.js";

describe("parseGoModTidyOutput — madeChanges detection (Gap #156)", () => {
  it("detects changes when go.mod hash differs", () => {
    const result = parseGoModTidyOutput("", "", 0, "hash1", "hash2", "hash3", "hash3");

    expect(result.success).toBe(true);
    expect(result.madeChanges).toBe(true);
  });

  it("detects changes when go.sum hash differs", () => {
    const result = parseGoModTidyOutput("", "", 0, "hash1", "hash1", "hash3", "hash4");

    expect(result.success).toBe(true);
    expect(result.madeChanges).toBe(true);
  });

  it("detects no changes when both hashes match", () => {
    const result = parseGoModTidyOutput("", "", 0, "hash1", "hash1", "hash3", "hash3");

    expect(result.success).toBe(true);
    expect(result.madeChanges).toBe(false);
  });

  it("infers changes when output is present but no hashes", () => {
    const result = parseGoModTidyOutput("", "go: downloading github.com/pkg/errors v0.9.1", 0);

    expect(result.success).toBe(true);
    expect(result.madeChanges).toBe(true);
  });

  it("infers no changes when no output and no hashes", () => {
    const result = parseGoModTidyOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.madeChanges).toBe(false);
  });

  it("does not set madeChanges on failure", () => {
    const result = parseGoModTidyOutput("", "go.mod not found", 1);

    expect(result.success).toBe(false);
    expect(result.madeChanges).toBeUndefined();
  });
});

// ─── Gap #157: vet analyzer name ────────────────────────────────────
// (Already tested in existing parseGoVetOutput tests above — they verify analyzer field.)
// Adding additional explicit test for completeness.

describe("parseGoVetOutput — analyzer name in diagnostics (Gap #157)", () => {
  it("includes analyzer name from JSON output", () => {
    const stdout = JSON.stringify({
      "myapp/pkg": {
        shadow: {
          posn: "handler.go:15:4",
          message: 'declaration of "err" shadows declaration',
        },
      },
    });

    const result = parseGoVetOutput(stdout, "", 2);

    expect(result.diagnostics![0].analyzer).toBe("shadow");
  });

  it("analyzer is undefined in text fallback mode", () => {
    const stderr = "main.go:10:5: unreachable code";

    const result = parseGoVetOutput("", stderr, 2);

    expect(result.diagnostics![0].analyzer).toBeUndefined();
  });
});
