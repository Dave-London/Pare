/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in the test runner tool.
 *
 * The run tool accepts an args array that gets spread into CLI arguments for
 * the detected test framework (pytest, jest, vitest, mocha). Without
 * validation, a malicious input like "--bail" or "--exec" could be
 * interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--bail",
  "--exec",
  "-u",
  "--updateSnapshot",
  "--coverage",
  "--config",
  "--reporter",
  "--outputFile",
  "-x",
  // Whitespace bypass attempts
  " --bail",
  "\t--exec",
  "   -u",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "tests/",
  "src/",
  "test_file.py",
  "MyTest",
  "integration",
  "unit",
  "*.test.ts",
  "login.spec.js",
];

describe("security: test run — args validation", () => {
  it("rejects flag-like args", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "args")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe args values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "args")).not.toThrow();
    }
  });

  it("includes the parameter name in the error message", () => {
    expect(() => assertNoFlagInjection("--bail", "args")).toThrow(/args/);
  });

  it("includes the invalid value in the error message", () => {
    expect(() => assertNoFlagInjection("--bail", "args")).toThrow(/--bail/);
    expect(() => assertNoFlagInjection("-x", "args")).toThrow(/-x/);
  });
});
