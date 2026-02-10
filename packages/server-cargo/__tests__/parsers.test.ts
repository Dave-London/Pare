import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
} from "../src/lib/parsers.js";

describe("parseCargoBuildJson", () => {
  it("parses build with errors", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
        },
      }),
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "unused variable `x`",
          spans: [{ file_name: "src/lib.rs", line_start: 20, column_start: 9 }],
        },
      }),
      JSON.stringify({ reason: "build-finished", success: false }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "src/main.rs",
      line: 10,
      column: 5,
      severity: "error",
      code: "E0308",
      message: "mismatched types",
    });
    expect(result.diagnostics[1].code).toBeUndefined();
  });

  it("parses clean build", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({ reason: "build-finished", success: true }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });

  it("ignores non-compiler-message entries", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "dep 1.0.0" }),
      JSON.stringify({ reason: "build-script-executed", package_id: "dep 1.0.0" }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.total).toBe(0);
  });
});

describe("parseCargoTestOutput", () => {
  it("parses test results", () => {
    const stdout = [
      "running 3 tests",
      "test tests::test_add ... ok",
      "test tests::test_sub ... ok",
      "test tests::test_div ... FAILED",
      "",
      "test result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.ignored).toBe(0);
    expect(result.tests[2].name).toBe("tests::test_div");
    expect(result.tests[2].status).toBe("FAILED");
  });

  it("parses all passing", () => {
    const stdout = [
      "running 2 tests",
      "test tests::test_a ... ok",
      "test tests::test_b ... ok",
      "",
      "test result: ok. 2 passed; 0 failed; 0 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("parses ignored tests", () => {
    const stdout = [
      "running 1 test",
      "test tests::slow_test ... ignored",
      "",
      "test result: ok. 0 passed; 0 failed; 1 ignored",
    ].join("\n");

    const result = parseCargoTestOutput(stdout, 0);
    expect(result.ignored).toBe(1);
  });
});

describe("parseCargoClippyJson", () => {
  it("parses clippy warnings", () => {
    const stdout = [
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "clippy::needless_return" },
          level: "warning",
          message: "unneeded `return` statement",
          spans: [{ file_name: "src/main.rs", line_start: 5, column_start: 5 }],
        },
      }),
    ].join("\n");

    const result = parseCargoClippyJson(stdout);
    expect(result.total).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0].code).toBe("clippy::needless_return");
  });

  it("parses clean clippy", () => {
    const stdout = JSON.stringify({ reason: "build-finished", success: true });
    const result = parseCargoClippyJson(stdout);
    expect(result.total).toBe(0);
  });
});
