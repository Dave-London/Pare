import { describe, it, expect } from "vitest";
import { formatGoBuild, formatGoTest, formatGoVet } from "../src/lib/formatters.js";
import type { GoBuildResult, GoTestResult, GoVetResult } from "../src/schemas/index.js";

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
      diagnostics: [],
      total: 0,
    };
    expect(formatGoVet(data)).toBe("go vet: no issues found.");
  });

  it("formats vet result with issues", () => {
    const data: GoVetResult = {
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
