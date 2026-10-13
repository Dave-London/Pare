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

  // Real Vitest 4.1.10 reports. In all of them numFailedTests is 0 and the
  // runner exits 1, so the suite-level failure is the only sign of trouble (#1174).
  describe("suite-level failures", () => {
    it("reports a throwing beforeAll, whose tests Vitest marks as skipped", () => {
      const result = parseVitestJson(fixture("vitest-json-hook-before-all.json"));

      expect(result.summary).toMatchObject({ total: 2, passed: 0, failed: 0, skipped: 2 });
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].name).toBe("before-all.test.ts (suite-level failure)");
      expect(result.failures[0].file).toBe("/project/__tests__/before-all.test.ts");
      // Vitest's JSON carries no error text for a hook failure; say so rather than leave it blank.
      expect(result.failures[0].message).toMatch(/beforeAll\/afterAll hook threw/);
    });

    it("reports a throwing afterAll even though every test passed", () => {
      const result = parseVitestJson(fixture("vitest-json-hook-after-all.json"));

      expect(result.summary).toMatchObject({ total: 1, passed: 1, failed: 0 });
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].name).toBe("after-all.test.ts (suite-level failure)");
    });

    it("reports a file that failed to load alongside files that passed, with Vitest's message", () => {
      const result = parseVitestJson(fixture("vitest-json-load-error-mixed.json"));

      expect(result.summary).toMatchObject({ total: 1, passed: 1, failed: 0 });
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].name).toBe("load-error.test.ts (suite-level failure)");
      expect(result.failures[0].message).toContain("Cannot find module './does-not-exist.js'");
    });

    it("flags only the failed file when a hook failure is mixed with passing files", () => {
      const result = parseVitestJson(fixture("vitest-json-hook-before-all-mixed.json"));

      expect(result.summary).toMatchObject({ total: 3, passed: 1, failed: 0, skipped: 2 });
      expect(result.failures.map((f) => f.file)).toEqual(["/project/__tests__/before-all.test.ts"]);
    });

    it("does not add a suite-level entry for a file that already has a failed test", () => {
      const result = parseVitestJson(fixture("vitest-json.json"));

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].name).not.toContain("suite-level failure");
    });
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
