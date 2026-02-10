/**
 * Fidelity tests for extractJson: realistic noisy output samples that
 * simulate real-world test runner and tool output with JSON embedded
 * in various kinds of surrounding noise.
 */
import { describe, it, expect } from "vitest";
import { extractJson } from "../src/tools/run.js";

describe("fidelity: extractJson with real-world output", () => {
  it("extracts vitest JSON with ANSI color noise before the JSON block", () => {
    const output = [
      "\x1b[32m\u2713\x1b[39m src/utils.test.ts (5 tests) 42ms",
      "\x1b[32m\u2713\x1b[39m src/core.test.ts (3 tests) 18ms",
      "",
      " \x1b[1mTest Files\x1b[22m  2 passed (2)",
      " \x1b[1m     Tests\x1b[22m  8 passed (8)",
      "",
      '{"numTotalTests":8,"numPassedTests":8,"numFailedTests":0,"numPendingTests":0,"testResults":[]}',
    ].join("\n");

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.numTotalTests).toBe(8);
    expect(parsed.numPassedTests).toBe(8);
    expect(parsed.testResults).toEqual([]);
  });

  it("extracts npm audit JSON with npm banner and warning lines", () => {
    const output = [
      "npm warn config global `--global`, `--local` are deprecated. Use `--location=global` instead.",
      "npm warn audit No fix available for package-x@1.2.3",
      "",
      '{"auditReportVersion":2,"vulnerabilities":{"lodash":{"severity":"high","via":["Prototype Pollution"]}},"metadata":{"totalDependencies":142}}',
      "",
      "found 1 high severity vulnerability",
    ].join("\n");

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.auditReportVersion).toBe(2);
    expect(parsed.vulnerabilities.lodash.severity).toBe("high");
    expect(parsed.metadata.totalDependencies).toBe(142);
  });

  it("extracts JSON with console.log noise before and after", () => {
    const output = [
      "Debugger attached.",
      "Waiting for the debugger to disconnect...",
      "console.log: Starting test suite...",
      "console.log: DB connected",
      '{"framework":"jest","summary":{"total":12,"passed":11,"failed":1},"failures":[{"name":"auth test","message":"timeout"}]}',
      "console.log: DB disconnected",
      "Done in 3.45s.",
    ].join("\n");

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.total).toBe(12);
    expect(parsed.failures).toHaveLength(1);
    expect(parsed.failures[0].name).toBe("auth test");
  });

  it("handles very deeply nested JSON (10+ levels deep)", () => {
    const deepObj = {
      l1: {
        l2: {
          l3: {
            l4: {
              l5: {
                l6: {
                  l7: {
                    l8: {
                      l9: {
                        l10: {
                          l11: { value: "deep-leaf" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const output = `noise prefix\n${JSON.stringify(deepObj)}\nnoise suffix`;

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.l1.l2.l3.l4.l5.l6.l7.l8.l9.l10.l11.value).toBe(
      "deep-leaf",
    );
  });

  it("handles JSON with escaped characters inside strings", () => {
    const obj = {
      error: 'Expected "hello\\nworld" to equal "hello\\tworld"',
      path: "C:\\Users\\dev\\project\\test.ts",
      message: 'Line contains "quotes" and \\backslashes\\',
      unicode: "\u2713 passed \u2717 failed",
    };
    const output = `runner output:\n${JSON.stringify(obj)}\ndone`;

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain("hello\\nworld");
    expect(parsed.path).toContain("C:\\Users\\dev");
    expect(parsed.message).toContain('"quotes"');
    expect(parsed.unicode).toContain("\u2713");
  });

  it("extracts JSON from output with CRLF line endings", () => {
    const output =
      'Starting...\r\n{"result":"ok","count":5}\r\nFinished.\r\n';

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.result).toBe("ok");
    expect(parsed.count).toBe(5);
  });

  it("handles real vitest failure JSON with stack traces in strings", () => {
    const output = [
      " DEV  v4.0.18",
      "",
      JSON.stringify({
        numTotalTests: 3,
        numPassedTests: 2,
        numFailedTests: 1,
        numPendingTests: 0,
        success: false,
        testResults: [
          {
            name: "/home/user/project/src/math.test.ts",
            assertionResults: [
              {
                fullName: "add > returns sum of two numbers",
                status: "passed",
                failureMessages: [],
              },
              {
                fullName: "add > handles negative numbers",
                status: "passed",
                failureMessages: [],
              },
              {
                fullName: "divide > throws on division by zero",
                status: "failed",
                failureMessages: [
                  "AssertionError: expected [Function] to throw an error\n    at /home/user/project/src/math.test.ts:15:22\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
                ],
              },
            ],
          },
        ],
      }),
      "",
      " Test Files  1 failed (1)",
      "      Tests  1 failed | 2 passed (3)",
    ].join("\n");

    const result = extractJson(output);
    const parsed = JSON.parse(result);
    expect(parsed.numTotalTests).toBe(3);
    expect(parsed.numFailedTests).toBe(1);
    expect(parsed.testResults[0].assertionResults).toHaveLength(3);
    expect(parsed.testResults[0].assertionResults[2].status).toBe("failed");
    expect(
      parsed.testResults[0].assertionResults[2].failureMessages[0],
    ).toContain("AssertionError");
  });
});
