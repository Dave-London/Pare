import { describe, it, expect } from "vitest";
import {
  formatGoBuild,
  formatGoTest,
  formatGoVet,
  formatGoEnv,
  formatGoList,
  formatGoGet,
  formatGolangciLint,
} from "../src/lib/formatters.js";
import type {
  GoBuildResult,
  GoTestResult,
  GoVetResult,
  GoEnvResult,
  GoListResult,
  GoGetResult,
  GolangciLintResult,
} from "../src/schemas/index.js";

describe("formatGoBuild", () => {
  it("formats successful build", () => {
    const data: GoBuildResult = {
      success: true,
      errors: [],
      total: 0,
    };
    expect(formatGoBuild(data)).toBe("go build: success.");
  });

  it("formats failed build with errors", () => {
    const data: GoBuildResult = {
      success: false,
      errors: [
        {
          file: "main.go",
          line: 10,
          column: 5,
          message: "undefined: fmt.Prinln",
        },
        {
          file: "handler.go",
          line: 20,
          message: "syntax error: unexpected newline",
        },
      ],
      total: 2,
    };
    const output = formatGoBuild(data);
    expect(output).toContain("go build: 2 errors");
    expect(output).toContain("main.go:10:5: undefined: fmt.Prinln");
    expect(output).toContain("handler.go:20: syntax error: unexpected newline");
  });

  it("formats failed build with error without column", () => {
    const data: GoBuildResult = {
      success: false,
      errors: [
        {
          file: "app.go",
          line: 1,
          message: "package declaration missing",
        },
      ],
      total: 1,
    };
    const output = formatGoBuild(data);
    expect(output).toContain("go build: 1 errors");
    expect(output).toContain("app.go:1: package declaration missing");
    expect(output).not.toContain("app.go:1::");
  });
});

describe("formatGoTest", () => {
  it("formats passing test results", () => {
    const data: GoTestResult = {
      success: true,
      tests: [
        { package: "myapp/auth", name: "TestLogin", status: "pass", elapsed: 0.05 },
        { package: "myapp/auth", name: "TestLogout", status: "pass", elapsed: 0.02 },
        { package: "myapp/util", name: "TestSkipped", status: "skip" },
      ],
      total: 3,
      passed: 2,
      failed: 0,
      skipped: 1,
    };
    const output = formatGoTest(data);
    expect(output).toContain("ok: 2 passed, 0 failed, 1 skipped");
    expect(output).toContain("pass myapp/auth/TestLogin (0.05s)");
    expect(output).toContain("pass myapp/auth/TestLogout (0.02s)");
    expect(output).toContain("skip myapp/util/TestSkipped");
  });

  it("formats failing test results", () => {
    const data: GoTestResult = {
      success: false,
      tests: [
        { package: "myapp/api", name: "TestHandler", status: "fail", elapsed: 0.1 },
        { package: "myapp/api", name: "TestMiddleware", status: "pass", elapsed: 0.03 },
      ],
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
    };
    const output = formatGoTest(data);
    expect(output).toContain("FAIL: 1 passed, 1 failed, 0 skipped");
    expect(output).toContain("fail myapp/api/TestHandler (0.1s)");
    expect(output).toContain("pass myapp/api/TestMiddleware (0.03s)");
  });

  it("formats empty test suite", () => {
    const data: GoTestResult = {
      success: true,
      tests: [],
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
    const output = formatGoTest(data);
    expect(output).toContain("ok: 0 passed, 0 failed, 0 skipped");
  });
});

describe("formatGoVet", () => {
  it("formats clean vet result", () => {
    const data: GoVetResult = {
      success: true,
      diagnostics: [],
      total: 0,
    };
    expect(formatGoVet(data)).toBe("go vet: no issues found.");
  });

  it("formats vet result with issues", () => {
    const data: GoVetResult = {
      success: false,
      diagnostics: [
        {
          file: "main.go",
          line: 15,
          column: 2,
          message: "unreachable code",
        },
        {
          file: "handler.go",
          line: 30,
          message: "possible misuse of unsafe.Pointer",
        },
      ],
      total: 2,
    };
    const output = formatGoVet(data);
    expect(output).toContain("go vet: 2 issues");
    expect(output).toContain("main.go:15:2: unreachable code");
    expect(output).toContain("handler.go:30: possible misuse of unsafe.Pointer");
  });
});

describe("formatGoEnv", () => {
  it("formats env with key fields", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
        CGO_ENABLED: "1",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };
    const output = formatGoEnv(data);
    expect(output).toContain("GOROOT=/usr/local/go");
    expect(output).toContain("GOPATH=/home/user/go");
    expect(output).toContain("GOVERSION=go1.22.0");
    expect(output).toContain("GOOS=linux");
    expect(output).toContain("GOARCH=amd64");
    expect(output).toContain("CGO_ENABLED=1");
  });

  it("formats env with only key fields", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };
    const output = formatGoEnv(data);
    const lines = output.split("\n");
    expect(lines).toHaveLength(5);
  });
});

describe("formatGoList", () => {
  it("formats empty package list", () => {
    const data: GoListResult = { success: true, packages: [], total: 0 };
    expect(formatGoList(data)).toBe("go list: no packages found.");
  });

  it("formats package list with entries", () => {
    const data: GoListResult = {
      success: true,
      packages: [
        { dir: "/project", importPath: "github.com/user/project", name: "main" },
        { dir: "/project/pkg/util", importPath: "github.com/user/project/pkg/util", name: "util" },
      ],
      total: 2,
    };
    const output = formatGoList(data);
    expect(output).toContain("go list: 2 packages");
    expect(output).toContain("github.com/user/project (main)");
    expect(output).toContain("github.com/user/project/pkg/util (util)");
  });
});

describe("formatGoGet", () => {
  it("formats successful go get", () => {
    const data: GoGetResult = {
      success: true,
      output: "go: downloading github.com/pkg/errors v0.9.1",
    };
    const output = formatGoGet(data);
    expect(output).toContain("go get: success.");
    expect(output).toContain("github.com/pkg/errors");
  });

  it("formats successful go get with no output", () => {
    const data: GoGetResult = { success: true };
    expect(formatGoGet(data)).toBe("go get: success.");
  });

  it("formats failed go get", () => {
    const data: GoGetResult = {
      success: false,
      output: 'go: module github.com/nonexistent/pkg: no matching versions for query "latest"',
    };
    const output = formatGoGet(data);
    expect(output).toContain("go get: FAIL");
    expect(output).toContain("no matching versions");
  });
});

describe("formatGolangciLint", () => {
  it("formats clean lint result", () => {
    const data: GolangciLintResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
      byLinter: [],
    };
    expect(formatGolangciLint(data)).toBe("golangci-lint: no issues found.");
  });

  it("formats lint result with issues", () => {
    const data: GolangciLintResult = {
      diagnostics: [
        {
          file: "main.go",
          line: 10,
          column: 5,
          linter: "govet",
          severity: "warning",
          message: "unreachable code",
        },
        {
          file: "handler.go",
          line: 25,
          linter: "errcheck",
          severity: "error",
          message: "Error return value is not checked",
        },
      ],
      total: 2,
      errors: 1,
      warnings: 1,
      byLinter: [
        { linter: "govet", count: 1 },
        { linter: "errcheck", count: 1 },
      ],
    };
    const output = formatGolangciLint(data);
    expect(output).toContain("golangci-lint: 2 issues (1 errors, 1 warnings)");
    expect(output).toContain("main.go:10:5: unreachable code (govet)");
    expect(output).toContain("handler.go:25: Error return value is not checked (errcheck)");
    expect(output).toContain("By linter:");
    expect(output).toContain("govet: 1");
    expect(output).toContain("errcheck: 1");
  });
});
