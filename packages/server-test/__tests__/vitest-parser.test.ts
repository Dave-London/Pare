import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseVitestJson, parseVitestCoverageJson } from "../src/lib/parsers/vitest.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("parseVitestJson", () => {
  it("parses JSON output with one failure", () => {
    const result = parseVitestJson(fixture("vitest-json.json"));

    expect(result.framework).toBe("vitest");
    expect(result.summary.total).toBe(10);
    expect(result.summary.passed).toBe(9);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect((result.tests ?? []).length).toBe(10);

    const fail = result.failures[0];
    expect(fail.name).toBe("parser > parses nested structures");
    expect(fail.file).toContain("parser.test.ts");
    expect(fail.line).toBe(28);
    expect(fail.expected).toContain('{"nested": true}');
    expect(fail.actual).toContain('{"nested": false}');
  });

  it("parses coverage-summary JSON", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 80 },
        lines: { pct: 81 },
        branches: { pct: 70 },
        functions: { pct: 90 },
      },
      "src/foo.ts": {
        statements: { pct: 88 },
        lines: { pct: 89 },
        branches: { pct: 77 },
        functions: { pct: 93 },
      },
    });
    const result = parseVitestCoverageJson(json);
    expect(result.summary.statements).toBe(80);
    expect(result.summary.lines).toBe(81);
    expect(result.totalFiles).toBe(1);
    expect(result.files?.[0].file).toBe("src/foo.ts");
  });
});
