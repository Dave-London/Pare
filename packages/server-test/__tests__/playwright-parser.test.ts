import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePlaywrightJson } from "../src/lib/parsers/playwright.js";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("parsePlaywrightJson", () => {
  it("parses JSON output with mixed results", () => {
    const result = parsePlaywrightJson(fixture("playwright-json.json"));

    expect(result.summary.total).toBe(6);
    expect(result.summary.passed).toBe(3);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.timedOut).toBe(1);
    expect(result.summary.interrupted).toBe(0);
    expect(result.summary.flaky).toBe(0);
    expect(result.summary.duration).toBe(36.1);

    expect(result.suites).toHaveLength(2);
    expect(result.suites[0].title).toBe("auth.spec.ts");
    expect(result.suites[0].tests).toHaveLength(3);
    expect(result.suites[1].title).toBe("dashboard.spec.ts");
    expect(result.suites[1].tests).toHaveLength(3);

    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].title).toBe("should show error for invalid password");
    expect(result.failures[0].file).toBe("tests/auth.spec.ts");
    expect(result.failures[0].line).toBe(15);
    expect(result.failures[0].error).toBe("Expected element to be visible");

    expect(result.failures[1].title).toBe("should handle slow network");
    expect(result.failures[1].error).toBe("Test timeout of 30000ms exceeded");
  });

  it("parses all-passing results", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "basic.spec.ts",
          file: "tests/basic.spec.ts",
          specs: [
            {
              title: "test 1",
              file: "tests/basic.spec.ts",
              line: 3,
              tests: [
                {
                  projectName: "chromium",
                  results: [{ status: "passed", duration: 100, retry: 0 }],
                },
              ],
            },
            {
              title: "test 2",
              file: "tests/basic.spec.ts",
              line: 10,
              tests: [
                {
                  projectName: "chromium",
                  results: [{ status: "passed", duration: 200, retry: 0 }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.timedOut).toBe(0);
    expect(result.summary.flaky).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  it("uses last retry result", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "flaky.spec.ts",
          file: "tests/flaky.spec.ts",
          specs: [
            {
              title: "flaky test",
              file: "tests/flaky.spec.ts",
              line: 5,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    {
                      status: "failed",
                      duration: 500,
                      retry: 0,
                      error: { message: "First attempt failed" },
                    },
                    { status: "passed", duration: 600, retry: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.total).toBe(1);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.flaky).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  it("handles nested suites", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "outer.spec.ts",
          file: "tests/outer.spec.ts",
          specs: [],
          suites: [
            {
              title: "inner group",
              specs: [
                {
                  title: "nested test",
                  file: "tests/outer.spec.ts",
                  line: 10,
                  tests: [
                    {
                      projectName: "chromium",
                      results: [{ status: "passed", duration: 300, retry: 0 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.total).toBe(1);
    expect(result.summary.passed).toBe(1);
    // Nested tests are flattened into parent suite
    expect(result.suites[0].tests).toHaveLength(1);
    expect(result.suites[0].tests[0].title).toBe("nested test");
  });

  it("handles errors array in results", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "multi-error.spec.ts",
          file: "tests/multi-error.spec.ts",
          specs: [
            {
              title: "test with multiple errors",
              file: "tests/multi-error.spec.ts",
              line: 3,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    {
                      status: "failed",
                      duration: 400,
                      retry: 0,
                      errors: [{ message: "Error one" }, { message: "Error two" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parsePlaywrightJson(json);

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toBe("Error one\nError two");
  });

  it("handles empty suites", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.total).toBe(0);
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.flaky).toBe(0);
    expect(result.suites).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  it("records retry count on test results", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "retry.spec.ts",
          file: "tests/retry.spec.ts",
          specs: [
            {
              title: "retried test",
              file: "tests/retry.spec.ts",
              line: 1,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    { status: "failed", duration: 100, retry: 0, error: { message: "fail" } },
                    { status: "failed", duration: 200, retry: 1, error: { message: "fail again" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.failed).toBe(1);
    expect(result.suites[0].tests[0].retry).toBe(1);
  });

  it("extracts flaky count from stats", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [
        {
          title: "mixed.spec.ts",
          file: "tests/mixed.spec.ts",
          specs: [
            {
              title: "stable test",
              file: "tests/mixed.spec.ts",
              line: 3,
              tests: [
                {
                  projectName: "chromium",
                  results: [{ status: "passed", duration: 100, retry: 0 }],
                },
              ],
            },
            {
              title: "flaky test",
              file: "tests/mixed.spec.ts",
              line: 10,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    {
                      status: "failed",
                      duration: 200,
                      retry: 0,
                      error: { message: "Flaky failure" },
                    },
                    { status: "passed", duration: 300, retry: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
      stats: {
        startTime: "2024-01-15T10:00:00.000Z",
        duration: 5000,
        expected: 1,
        unexpected: 0,
        flaky: 2,
        skipped: 0,
        interrupted: 0,
      },
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.flaky).toBe(2);
    expect(result.summary.duration).toBe(5);
  });

  it("defaults flaky to 0 when stats are missing", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [],
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.flaky).toBe(0);
  });

  it("defaults flaky to 0 when stats.flaky is missing", () => {
    const json = JSON.stringify({
      config: { rootDir: "/project" },
      suites: [],
      stats: {
        duration: 1000,
        expected: 1,
        unexpected: 0,
      },
    });

    const result = parsePlaywrightJson(json);

    expect(result.summary.flaky).toBe(0);
  });
});
