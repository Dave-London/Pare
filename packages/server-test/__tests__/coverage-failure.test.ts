/**
 * Tests for the coverage tool's exit-code guard (#1177): a coverage run whose
 * runner exits non-zero (a failed test, a suite that failed to load, a hook that
 * threw, a missed threshold) must NOT come back as a clean coverage result.
 */
import { describe, it, expect } from "vitest";
import { surfaceCoverageFailure } from "../src/tools/coverage.js";
import {
  formatCoverage,
  compactCoverageMap,
  formatCoverageCompact,
} from "../src/lib/formatters.js";
import type { Coverage } from "../src/schemas/index.js";

const half: Coverage = {
  framework: "vitest",
  summary: { lines: 50, statements: 50 },
  files: [{ file: "src/a.ts", lines: 50 }],
};

describe("surfaceCoverageFailure", () => {
  it("leaves a clean run alone", () => {
    const out = surfaceCoverageFailure(half, { exitCode: 0, stdout: "", stderr: "" }, 40);
    expect(out).toBe(half);
    expect(out.error).toBeUndefined();
  });

  it("flags a non-zero exit, with the runner output for context", () => {
    const out = surfaceCoverageFailure(half, {
      exitCode: 1,
      stdout: "",
      stderr: "Error: beforeAll hook failed in tests/a.test.ts",
    });

    expect(out.error).toMatch(/exited with code 1/);
    expect(out.error).toMatch(/not a passing run/);
    expect(out.error).toContain("beforeAll hook failed");
    // The percentages are kept: they are still useful, just not a pass.
    expect(out.summary.lines).toBe(50);
  });

  it("names a missed failUnder as the cause", () => {
    const out = surfaceCoverageFailure(
      half,
      {
        exitCode: 1,
        stdout: "ERROR: Coverage for lines (50%) does not meet threshold (100%)",
        stderr: "",
      },
      100,
    );

    expect(out.error).toMatch(/^Line coverage 50% is below failUnder 100%\./);
    expect(out.error).toContain("does not meet threshold");
  });

  it("does not blame failUnder when coverage met it", () => {
    const out = surfaceCoverageFailure(
      half,
      { exitCode: 1, stdout: "", stderr: "1 test failed" },
      40,
    );

    expect(out.error).not.toMatch(/below failUnder/);
    expect(out.error).toMatch(/exited with code 1/);
  });
});

describe("coverage formatters with an error", () => {
  const failed = surfaceCoverageFailure(half, { exitCode: 1, stdout: "", stderr: "boom" }, 100);

  it("marks the full text output as ERROR", () => {
    const text = formatCoverage(failed);
    expect(text.split("\n")[0]).toBe("ERROR Coverage (vitest): 50% lines, 50% statements");
    expect(text).toContain("below failUnder 100%");
  });

  it("keeps the error in compact output", () => {
    const compact = compactCoverageMap(failed);
    expect(compact.error).toBe(failed.error);
    expect(formatCoverageCompact(compact)).toMatch(/^ERROR Coverage \(vitest\)/);
  });

  it("adds no error field to a clean compact result", () => {
    expect(compactCoverageMap(half)).not.toHaveProperty("error");
  });
});
