/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in swift tools, and that Zod .max()
 * constraints enforce input size limits.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--target",
  "--product",
  "-c",
  "--configuration",
  "--filter",
  "--type",
  "-p",
  // Whitespace bypass attempts
  " --target",
  "\t--product",
  "   -c",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "MyApp",
  "my-library",
  "MyTests",
  "swift_module",
  "Sources/main",
  "test_name_filter",
  "v1.0.0",
];

describe("security: swift build — target validation", () => {
  it("rejects flag-like target names", () => {
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

describe("security: swift build — product validation", () => {
  it("rejects flag-like product names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "product")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe product names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "product")).not.toThrow();
    }
  });
});

describe("security: swift test — filter validation", () => {
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

describe("security: swift run — executable validation", () => {
  it("rejects flag-like executable names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "executable")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe executable names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "executable")).not.toThrow();
    }
  });
});

describe("security: swift package-update — packages validation", () => {
  it("rejects flag-like package names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });
});

describe("security: swift package-init — name validation", () => {
  it("rejects flag-like package init names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "name")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package init names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "name")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Swift tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Swift tool schemas", () => {
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

  describe("target parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a target name within the limit", () => {
      expect(schema.safeParse("MyLibrary").success).toBe(true);
    });

    it("rejects a target name exceeding SHORT_STRING_MAX", () => {
      const oversized = "x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("packages array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `pkg-${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects package name exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal package names", () => {
      expect(schema.safeParse(["swift-log", "swift-nio"]).success).toBe(true);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `arg-${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["--verbose", "input.txt"]).success).toBe(true);
    });
  });
});
