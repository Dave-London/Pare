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
import { z } from "zod";
import { assertNoFlagInjection, assertSafePassthroughArg, INPUT_LIMITS } from "@paretools/shared";

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

describe("security: test run — filter validation", () => {
  it("rejects flag-like filter values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "filter")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe filter values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "filter")).not.toThrow();
    }
  });
});

describe("security: test run — args passthrough validation", () => {
  // The `args` field is an explicit passthrough: leading `-`/`--` flags are the
  // caller's intent (e.g. `-p no:logfire` to disable a pytest plugin). Because
  // execFile does not spawn a shell, these are not shell-interpreted. Only NUL
  // and newline control characters are rejected. See issue #931.
  it("accepts legitimate framework flags", () => {
    const flags = [
      "-p",
      "no:logfire",
      "-p no:cacheprovider",
      "--maxfail=2",
      "--no-header",
      "-rA",
      "--tb=short",
    ];
    for (const flag of flags) {
      expect(() => assertSafePassthroughArg(flag, "args")).not.toThrow();
    }
  });

  it("accepts safe non-flag args values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertSafePassthroughArg(safe, "args")).not.toThrow();
    }
  });

  it("rejects args containing NUL or newline control characters", () => {
    for (const bad of ["foo\0bar", "line1\nline2", "carriage\rreturn"]) {
      expect(() => assertSafePassthroughArg(bad, "args")).toThrow(/NUL or newline/);
    }
  });

  it("includes the parameter name in the error message", () => {
    expect(() => assertSafePassthroughArg("bad\0", "args")).toThrow(/args/);
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Test tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Test tool schemas", () => {
  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "arg");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects arg string exceeding STRING_MAX", () => {
      const oversized = ["a".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["tests/", "unit"]).success).toBe(true);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
