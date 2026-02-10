import { describe, it, expect } from "vitest";
import { parseTscOutput, parseBuildCommandOutput } from "../src/lib/parsers.js";

describe("parseTscOutput", () => {
  it("parses typical tsc errors", () => {
    const stdout = [
      "src/index.ts(5,3): error TS2322: Type 'string' is not assignable to type 'number'.",
      "src/index.ts(12,10): error TS2304: Cannot find name 'foo'.",
      "Found 2 errors in 1 file.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics[0]).toEqual({
      file: "src/index.ts",
      line: 5,
      column: 3,
      code: 2322,
      severity: "error",
      message: "Type 'string' is not assignable to type 'number'.",
    });
    expect(result.diagnostics[1].code).toBe(2304);
  });

  it("parses clean output", () => {
    const result = parseTscOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("parses errors from multiple files", () => {
    const stdout = [
      "src/a.ts(1,1): error TS2307: Cannot find module './missing'.",
      "src/b.ts(10,5): error TS7006: Parameter 'x' implicitly has an 'any' type.",
      "src/c.ts(3,8): error TS2339: Property 'foo' does not exist on type 'Bar'.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(3);
    expect(result.diagnostics.map((d) => d.file)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("parses errors with Windows paths", () => {
    const stdout = "C:\\Users\\dev\\project\\src\\index.ts(5,3): error TS2322: Type mismatch.";
    const result = parseTscOutput(stdout, "", 2);

    expect(result.total).toBe(1);
    expect(result.diagnostics[0].file).toBe("C:\\Users\\dev\\project\\src\\index.ts");
  });

  it("ignores non-diagnostic lines", () => {
    const stdout = [
      "Version 5.7.0",
      "src/index.ts(5,3): error TS2322: Type mismatch.",
      "",
      "Found 1 error.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);
    expect(result.total).toBe(1);
  });
});

describe("parseBuildCommandOutput", () => {
  it("parses successful build", () => {
    const stdout = "Build completed successfully\nOutput: dist/index.js";
    const result = parseBuildCommandOutput(stdout, "", 0, 3.5);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(3.5);
    expect(result.errors).toEqual([]);
  });

  it("parses failed build with errors", () => {
    const stdout = "Compiling...\nError: Module not found: ./missing";
    const stderr = "Build error: compilation failed";
    const result = parseBuildCommandOutput(stdout, stderr, 1, 2.0);

    expect(result.success).toBe(false);
    expect(result.duration).toBe(2.0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("captures warnings", () => {
    const stdout = "Warning: unused variable 'x'\nWarning: deprecated API call\nBuild completed";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });

  it("handles empty output", () => {
    const result = parseBuildCommandOutput("", "", 0, 0.5);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
