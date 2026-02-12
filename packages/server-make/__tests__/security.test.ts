/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Make/Just tools.
 *
 * These tools accept user-provided strings (target names, arguments) that are
 * passed as positional arguments to make/just. Without validation, a malicious
 * input like "--eval=..." could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--eval=rm -rf /",
  "-f",
  "--file=/etc/passwd",
  "-n",
  "--just-flag",
  "-B",
  "--always-make",
  "--directory",
  // Whitespace bypass attempts
  " --eval",
  "\t-f",
  "   --file",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "build",
  "test",
  "clean",
  "deploy-staging",
  "build_all",
  "test-unit",
  "my-project/build",
  "v1.0.0",
  "step3",
];

describe("security: make/just run — target validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "target")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe target names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "target")).not.toThrow();
    }
  });
});

describe("security: make/just run — args validation", () => {
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
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Make tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Make tool schemas", () => {
  describe("target parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a target within the limit", () => {
      expect(schema.safeParse("build").success).toBe(true);
    });

    it("rejects a target exceeding SHORT_STRING_MAX", () => {
      const oversized = "t".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `arg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects arg exceeding STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["VAR=value", "VERBOSE=1"]).success).toBe(true);
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
