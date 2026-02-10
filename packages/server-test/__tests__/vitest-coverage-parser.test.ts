import { describe, it, expect } from "vitest";
import { parseVitestCoverage } from "../src/lib/parsers/vitest.js";

describe("parseVitestCoverage", () => {
  it("parses standard coverage table output", () => {
    const stdout = [
      "----------|---------|----------|---------|---------|-------------------",
      "File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s",
      "----------|---------|----------|---------|---------|-------------------",
      "All files |   90.00 |    80.00 |   85.00 |   92.50 |",
      " index.ts |  100.00 |   100.00 |  100.00 |  100.00 |",
      " utils.ts |   80.00 |    60.00 |   70.00 |   85.00 | 12-15,28",
      "----------|---------|----------|---------|---------|-------------------",
    ].join("\n");

    const result = parseVitestCoverage(stdout);

    expect(result.framework).toBe("vitest");
    expect(result.summary.lines).toBe(92.5);
    expect(result.summary.branches).toBe(80);
    expect(result.summary.functions).toBe(85);
    expect(result.files).toHaveLength(2);

    expect(result.files[0]).toEqual({
      file: "index.ts",
      lines: 100,
      branches: 100,
      functions: 100,
    });

    expect(result.files[1]).toEqual({
      file: "utils.ts",
      lines: 85,
      branches: 60,
      functions: 70,
    });
  });

  it("returns empty files and zero summary for empty input", () => {
    const result = parseVitestCoverage("");

    expect(result.framework).toBe("vitest");
    expect(result.summary).toEqual({ lines: 0, branches: 0, functions: 0 });
    expect(result.files).toHaveLength(0);
  });

  it("returns empty files for non-table text", () => {
    const result = parseVitestCoverage("some random output with no table");

    expect(result.framework).toBe("vitest");
    expect(result.files).toHaveLength(0);
  });

  it("skips header and separator lines", () => {
    const stdout = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   75.00 |    50.00 |   60.00 |   80.00 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseVitestCoverage(stdout);

    expect(result.summary.lines).toBe(80);
    expect(result.summary.branches).toBe(50);
    expect(result.summary.functions).toBe(60);
    expect(result.files).toHaveLength(0);
  });

  it("parses coverage with many files", () => {
    const stdout = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   85.00 |    70.00 |   90.00 |   87.00 |",
      " a.ts     |  100.00 |   100.00 |  100.00 |  100.00 |",
      " b.ts     |   70.00 |    40.00 |   80.00 |   74.00 |",
      " c.ts     |   85.00 |    70.00 |   90.00 |   87.00 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseVitestCoverage(stdout);

    expect(result.files).toHaveLength(3);
    expect(result.files[0].file).toBe("a.ts");
    expect(result.files[1].file).toBe("b.ts");
    expect(result.files[2].file).toBe("c.ts");
  });

  it("handles decimal percentages", () => {
    const stdout = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   85.71 |    66.67 |  100.00 |   87.50 |",
      " auth.ts  |   85.71 |    66.67 |  100.00 |   87.50 | 42",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseVitestCoverage(stdout);

    expect(result.summary.lines).toBe(87.5);
    expect(result.summary.branches).toBe(66.67);
    expect(result.summary.functions).toBe(100);
    expect(result.files[0].lines).toBe(87.5);
    expect(result.files[0].branches).toBe(66.67);
  });

  it("handles output with extra text before and after table", () => {
    const stdout = [
      "RUN  v3.0.0",
      "",
      " PASS  src/index.test.ts",
      "",
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   95.00 |    90.00 |  100.00 |   95.00 |",
      " index.ts |   95.00 |    90.00 |  100.00 |   95.00 |",
      "----------|---------|----------|---------|---------|",
      "",
      "Test Files  1 passed (1)",
      "Tests  5 passed (5)",
    ].join("\n");

    const result = parseVitestCoverage(stdout);

    expect(result.summary.lines).toBe(95);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe("index.ts");
  });
});
