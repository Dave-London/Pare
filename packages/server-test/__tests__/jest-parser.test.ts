import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseJestJson,
  parseJestCoverage,
  parseJestCoverageJson,
} from "../src/lib/parsers/jest.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("parseJestJson", () => {
  it("parses JSON output with failures", () => {
    const result = parseJestJson(fixture("jest-json.json"));

    expect(result.framework).toBe("jest");
    expect(result.summary.total).toBe(8);
    expect(result.summary.passed).toBe(6);
    expect(result.summary.failed).toBe(2);
    expect(result.summary.skipped).toBe(0);
    expect(result.failures).toHaveLength(2);
    expect((result.tests ?? []).length).toBe(8);

    const firstFail = result.failures[0];
    expect(firstFail.name).toBe("api > POST /users should validate email");
    expect(firstFail.file).toContain("api.test.ts");
    expect(firstFail.line).toBe(15);
    expect(firstFail.expected).toContain("valid@email.com");
    expect(firstFail.actual).toBe("undefined");

    const secondFail = result.failures[1];
    expect(secondFail.name).toBe("utils > should parse config file");
    expect(secondFail.line).toBe(42);
  });
});

describe("parseJestCoverage", () => {
  it("parses text coverage output", () => {
    const result = parseJestCoverage(fixture("jest-coverage.txt"));

    expect(result.framework).toBe("jest");
    expect(result.summary.lines).toBe(87.5);
    expect(result.summary.statements).toBe(85.71);
    expect(result.summary.branches).toBe(66.67);
    expect(result.summary.functions).toBe(100);
    expect(result.files).toHaveLength(3);

    expect(result.files[0]).toEqual({
      file: "auth.ts",
      statements: 100,
      lines: 100,
      branches: 100,
      functions: 100,
    });
    expect(result.files[1].file).toBe("api.ts");
    expect(result.files[1].statements).toBe(71.43);
    expect(result.files[1].lines).toBe(75);
  });

  it("parses coverage-summary JSON", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 90 },
        lines: { pct: 91 },
        branches: { pct: 72 },
        functions: { pct: 95 },
      },
      "src/a.ts": {
        statements: { pct: 100 },
        lines: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
      },
    });
    const result = parseJestCoverageJson(json);
    expect(result.summary.statements).toBe(90);
    expect(result.summary.lines).toBe(91);
    expect(result.totalFiles).toBe(1);
    expect(result.files?.[0].statements).toBe(100);
  });
});
