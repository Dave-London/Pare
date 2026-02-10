import { describe, it, expect } from "vitest";
import { parseGoBuildOutput, parseGoTestJson, parseGoVetOutput } from "../src/lib/parsers.js";

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

    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(2);
    expect(result.diagnostics[0]).toEqual({
      file: "main.go",
      line: 10,
      column: 5,
      message: "printf call has arguments but no formatting directives",
    });
  });

  it("parses clean vet", () => {
    const result = parseGoVetOutput("", "");
    expect(result.total).toBe(0);
  });
});
