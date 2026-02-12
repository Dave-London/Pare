/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in search tools.
 *
 * These tools accept user-provided strings (patterns, paths, glob patterns,
 * file extensions) that are passed as positional arguments to rg/fd. Without
 * validation, a malicious input like "--exec=rm -rf /" could be interpreted
 * as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--exec=rm -rf /",
  "-l",
  "--replace=pwned",
  "-o",
  "--output",
  "--json",
  "--count",
  "--files",
  "--passthru",
  // Whitespace bypass attempts
  " --exec",
  "\t-l",
  "   --replace",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "function",
  "TODO",
  "import.*from",
  "*.ts",
  "src/lib",
  ".",
  "test_pattern",
  "README.md",
  "ts",
  "tsx",
];

describe("security: search — pattern validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "pattern")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe patterns", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "pattern")).not.toThrow();
    }
  });
});

describe("security: search — path validation", () => {
  it("rejects flag-like paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "path")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "path")).not.toThrow();
    }
  });
});

describe("security: search — glob validation", () => {
  it("rejects flag-like globs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "glob")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe globs", () => {
    const safeGlobs = ["*.ts", "*.{js,jsx}", "src/**/*.ts", "!node_modules"];
    for (const safe of safeGlobs) {
      expect(() => assertNoFlagInjection(safe, "glob")).not.toThrow();
    }
  });
});

describe("security: find — extension validation", () => {
  it("rejects flag-like extensions", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "extension")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe extensions", () => {
    const safeExtensions = ["ts", "js", "tsx", "jsx", "py", "go", "rs"];
    for (const safe of safeExtensions) {
      expect(() => assertNoFlagInjection(safe, "extension")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Search tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Search tool schemas", () => {
  describe("pattern parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a pattern within the limit", () => {
      expect(schema.safeParse("function.*export").success).toBe(true);
    });

    it("rejects a pattern exceeding STRING_MAX", () => {
      const oversized = "x".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project/src").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("glob parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a glob within the limit", () => {
      expect(schema.safeParse("*.{ts,tsx,js,jsx}").success).toBe(true);
    });

    it("rejects a glob exceeding SHORT_STRING_MAX", () => {
      const oversized = "g".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("extension parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts an extension within the limit", () => {
      expect(schema.safeParse("ts").success).toBe(true);
    });

    it("rejects an extension exceeding SHORT_STRING_MAX", () => {
      const oversized = "e".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
