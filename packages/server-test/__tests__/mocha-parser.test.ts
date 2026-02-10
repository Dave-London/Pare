import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMochaJson, parseMochaCoverage } from "../src/lib/parsers/mocha.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("parseMochaJson", () => {
  it("parses JSON output with failures", () => {
    const result = parseMochaJson(fixture("mocha-json.json"));

    expect(result.framework).toBe("mocha");
    expect(result.summary.total).toBe(8);
    expect(result.summary.passed).toBe(5);
    expect(result.summary.failed).toBe(2);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.duration).toBe(1.25);
    expect(result.failures).toHaveLength(2);

    const firstFail = result.failures[0];
    expect(firstFail.name).toBe("Database should delete a record");
    expect(firstFail.file).toBe("test/db.test.js");
    expect(firstFail.message).toBe("expected 0 to equal 1");
    expect(firstFail.expected).toBe("1");
    expect(firstFail.actual).toBe("0");
    expect(firstFail.stack).toContain("AssertionError");

    const secondFail = result.failures[1];
    expect(secondFail.name).toBe("Utils should parse config");
    expect(secondFail.file).toBe("test/utils.test.js");
    expect(secondFail.message).toContain("Cannot read properties of null");
    expect(secondFail.expected).toBeUndefined();
    expect(secondFail.actual).toBeUndefined();
  });

  it("parses all-passing output", () => {
    const json = JSON.stringify({
      stats: {
        suites: 1,
        tests: 3,
        passes: 3,
        failures: 0,
        pending: 0,
        duration: 500,
      },
      passes: [
        { title: "test1", fullTitle: "Suite test1", file: "test/a.js", duration: 10 },
        { title: "test2", fullTitle: "Suite test2", file: "test/a.js", duration: 15 },
        { title: "test3", fullTitle: "Suite test3", file: "test/a.js", duration: 5 },
      ],
      failures: [],
      pending: [],
    });

    const result = parseMochaJson(json);
    expect(result.framework).toBe("mocha");
    expect(result.summary.total).toBe(3);
    expect(result.summary.passed).toBe(3);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.duration).toBe(0.5);
    expect(result.failures).toHaveLength(0);
  });

  it("parses all-failing output", () => {
    const json = JSON.stringify({
      stats: {
        suites: 1,
        tests: 2,
        passes: 0,
        failures: 2,
        pending: 0,
        duration: 200,
      },
      passes: [],
      failures: [
        {
          title: "fail1",
          fullTitle: "Suite fail1",
          file: "test/b.js",
          duration: 5,
          err: { message: "assertion error", stack: "Error: assertion error\n    at test/b.js:10" },
        },
        {
          title: "fail2",
          fullTitle: "Suite fail2",
          file: "test/b.js",
          duration: 3,
          err: {
            message: "expected true to be false",
            stack: "AssertionError: expected true to be false",
            expected: false,
            actual: true,
          },
        },
      ],
      pending: [],
    });

    const result = parseMochaJson(json);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(2);
    expect(result.failures).toHaveLength(2);

    expect(result.failures[1].expected).toBe("false");
    expect(result.failures[1].actual).toBe("true");
  });

  it("parses empty suite", () => {
    const json = JSON.stringify({
      stats: {
        suites: 0,
        tests: 0,
        passes: 0,
        failures: 0,
        pending: 0,
        duration: 10,
      },
      passes: [],
      failures: [],
      pending: [],
    });

    const result = parseMochaJson(json);
    expect(result.summary.total).toBe(0);
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.duration).toBe(0.01);
    expect(result.failures).toHaveLength(0);
  });

  it("handles missing file field gracefully", () => {
    const json = JSON.stringify({
      stats: {
        suites: 1,
        tests: 1,
        passes: 0,
        failures: 1,
        pending: 0,
        duration: 100,
      },
      passes: [],
      failures: [
        {
          title: "anon test",
          fullTitle: "anon test",
          duration: 5,
          err: { message: "failed" },
        },
      ],
      pending: [],
    });

    const result = parseMochaJson(json);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].file).toBeUndefined();
    expect(result.failures[0].message).toBe("failed");
  });

  it("handles zero duration", () => {
    const json = JSON.stringify({
      stats: {
        suites: 1,
        tests: 1,
        passes: 1,
        failures: 0,
        pending: 0,
        duration: 0,
      },
      passes: [{ title: "fast", fullTitle: "Suite fast", file: "test/c.js", duration: 0 }],
      failures: [],
      pending: [],
    });

    const result = parseMochaJson(json);
    expect(result.summary.duration).toBe(0);
  });
});

describe("parseMochaCoverage", () => {
  it("parses nyc/Istanbul text coverage output", () => {
    const output = `
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   82.35 |    71.43 |   88.89 |   82.35 |
 db.js    |     100 |      100 |     100 |     100 |
 api.js   |   66.67 |       50 |   83.33 |   66.67 | 12-15,28
 utils.js |      80 |    66.67 |   83.33 |      80 | 22-25
----------|---------|----------|---------|---------|-------------------
`;

    const result = parseMochaCoverage(output);
    expect(result.framework).toBe("mocha");
    expect(result.summary.lines).toBe(82.35);
    expect(result.summary.branches).toBe(71.43);
    expect(result.summary.functions).toBe(88.89);
    expect(result.files).toHaveLength(3);

    expect(result.files[0]).toEqual({
      file: "db.js",
      lines: 100,
      branches: 100,
      functions: 100,
    });
    expect(result.files[1].file).toBe("api.js");
    expect(result.files[1].lines).toBe(66.67);
    expect(result.files[2].file).toBe("utils.js");
    expect(result.files[2].lines).toBe(80);
  });

  it("parses many files with varying percentages", () => {
    const output = [
      "----------|---------|----------|---------|---------|-------------------",
      "File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s",
      "----------|---------|----------|---------|---------|-------------------",
      "All files |   72.50 |    60.00 |   80.00 |   75.00 |",
      " a.js     |  100.00 |   100.00 |  100.00 |  100.00 |",
      " b.js     |   90.00 |    85.00 |   95.00 |   92.00 | 5",
      " c.js     |   75.00 |    50.00 |   80.00 |   78.00 | 10-12",
      " d.js     |   60.00 |    40.00 |   70.00 |   65.00 | 3-8,15",
      " e.js     |   50.00 |    30.00 |   55.00 |   52.00 | 1-20",
      " f.js     |   40.00 |    25.00 |   45.00 |   42.00 | 2-30",
      " g.js     |   85.71 |    66.67 |   83.33 |   87.50 | 22",
      "----------|---------|----------|---------|---------|-------------------",
    ].join("\n");

    const result = parseMochaCoverage(output);
    expect(result.framework).toBe("mocha");
    expect(result.summary.lines).toBe(75);
    expect(result.summary.branches).toBe(60);
    expect(result.summary.functions).toBe(80);
    expect(result.files).toHaveLength(7);

    expect(result.files[0].file).toBe("a.js");
    expect(result.files[0].lines).toBe(100);
    expect(result.files[6].file).toBe("g.js");
    expect(result.files[6].lines).toBe(87.5);
    expect(result.files[6].branches).toBe(66.67);
    expect(result.files[6].functions).toBe(83.33);
  });

  it("parses decimal percentages accurately", () => {
    const output = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   33.33 |    16.67 |   66.67 |   33.33 |",
      " math.js  |   33.33 |    16.67 |   66.67 |   33.33 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseMochaCoverage(output);
    expect(result.summary.lines).toBe(33.33);
    expect(result.summary.branches).toBe(16.67);
    expect(result.summary.functions).toBe(66.67);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].lines).toBe(33.33);
    expect(result.files[0].branches).toBe(16.67);
    expect(result.files[0].functions).toBe(66.67);
  });

  it("returns empty results for empty output", () => {
    const result = parseMochaCoverage("");
    expect(result.framework).toBe("mocha");
    expect(result.summary.lines).toBe(0);
    expect(result.summary.branches).toBe(0);
    expect(result.summary.functions).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("returns empty results for non-table text", () => {
    const result = parseMochaCoverage("some random output with no coverage table");
    expect(result.framework).toBe("mocha");
    expect(result.files).toHaveLength(0);
    expect(result.summary.lines).toBe(0);
  });

  it("handles single file coverage", () => {
    const output = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |   95.00 |    90.00 |  100.00 |   95.00 |",
      " index.js |   95.00 |    90.00 |  100.00 |   95.00 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseMochaCoverage(output);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe("index.js");
    expect(result.files[0].lines).toBe(95);
    expect(result.files[0].branches).toBe(90);
    expect(result.files[0].functions).toBe(100);
    expect(result.summary.lines).toBe(95);
  });

  it("handles 100% coverage across all metrics", () => {
    const output = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |  100.00 |   100.00 |  100.00 |  100.00 |",
      " lib.js   |  100.00 |   100.00 |  100.00 |  100.00 |",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseMochaCoverage(output);
    expect(result.summary.lines).toBe(100);
    expect(result.summary.branches).toBe(100);
    expect(result.summary.functions).toBe(100);
    expect(result.files[0].lines).toBe(100);
  });

  it("handles 0% coverage across all metrics", () => {
    const output = [
      "----------|---------|----------|---------|---------|",
      "File      | % Stmts | % Branch | % Funcs | % Lines |",
      "----------|---------|----------|---------|---------|",
      "All files |    0.00 |     0.00 |    0.00 |    0.00 |",
      " empty.js |    0.00 |     0.00 |    0.00 |    0.00 | 1-50",
      "----------|---------|----------|---------|---------|",
    ].join("\n");

    const result = parseMochaCoverage(output);
    expect(result.summary.lines).toBe(0);
    expect(result.summary.branches).toBe(0);
    expect(result.summary.functions).toBe(0);
    expect(result.files[0].lines).toBe(0);
    expect(result.files[0].branches).toBe(0);
    expect(result.files[0].functions).toBe(0);
  });
});
