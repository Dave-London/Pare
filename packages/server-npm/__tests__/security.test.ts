/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in npm tools.
 *
 * These tools accept user-provided strings (script names, args arrays) that
 * are passed as positional arguments to the npm CLI. Without validation,
 * a malicious input like "--scripts-prepend-node-path" could be interpreted
 * as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--force",
  "--scripts-prepend-node-path",
  "-g",
  "--global",
  "--unsafe-perm",
  "--ignore-scripts",
  "-D",
  "--save-dev",
  "--registry",
  // Whitespace bypass attempts
  " --force",
  "\t--global",
  "   -g",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "express",
  "lodash",
  "react",
  "@types/node",
  "my-package",
  "build",
  "test",
  "start",
  "lint",
  "src/index.ts",
];

describe("security: npm install — args validation", () => {
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

describe("security: npm test — args validation", () => {
  it("rejects flag-like args", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "args")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: npm run — script and args validation", () => {
  it("rejects flag-like script names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "script")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe script names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "script")).not.toThrow();
    }
  });

  it("rejects flag-like args", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "args")).toThrow(/must not start with "-"/);
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — npm tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — npm tool schemas", () => {
  describe("script name (SHORT_STRING_MAX = 255)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a script name within the limit", () => {
      expect(schema.safeParse("build").success).toBe(true);
    });

    it("rejects a script name exceeding SHORT_STRING_MAX", () => {
      const oversized = "s".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

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
      expect(schema.safeParse(["express", "lodash"]).success).toBe(true);
    });
  });

  describe("path parameter (PATH_MAX = 4,096)", () => {
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
