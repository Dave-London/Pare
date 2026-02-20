/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Bun tools.
 *
 * These tools accept user-provided strings (script names, package names, file paths)
 * that are passed as positional arguments to bun. Without validation, a malicious
 * input like "--eval=..." could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--eval=rm -rf /",
  "-e",
  "--smol",
  "--hot",
  "-w",
  "--watch",
  "--preload",
  "--config",
  // Whitespace bypass attempts
  " --eval",
  "\t-e",
  "   --config",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "dev",
  "build",
  "test",
  "start",
  "my-script",
  "src/index.ts",
  "lib/utils.js",
  "v1.0.0",
  "typescript",
  "@types/node",
  "zod@3.22",
];

describe("security: bun run — script validation", () => {
  it("rejects flag-like scripts", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "script")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe script names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "script")).not.toThrow();
    }
  });
});

describe("security: bun add/remove — packages validation", () => {
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

describe("security: bun test — files validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe file paths", () => {
    const safePaths = [
      "src/index.test.ts",
      "./tests/unit.test.js",
      "lib/my-test.test.ts",
      "test-utils.ts",
    ];
    for (const safe of safePaths) {
      expect(() => assertNoFlagInjection(safe, "files")).not.toThrow();
    }
  });
});

describe("security: bun build — entrypoints validation", () => {
  it("rejects flag-like entrypoints", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "entrypoints")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe entrypoint paths", () => {
    const safePaths = ["src/index.ts", "./app.tsx", "lib/main.js"];
    for (const safe of safePaths) {
      expect(() => assertNoFlagInjection(safe, "entrypoints")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Bun tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Bun tool schemas", () => {
  describe("script parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a script within the limit", () => {
      expect(schema.safeParse("dev").success).toBe(true);
    });

    it("rejects a script exceeding SHORT_STRING_MAX", () => {
      const oversized = "s".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("packages array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "pkg");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects package name exceeding SHORT_STRING_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("entrypoints array (ARRAY_MAX + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "src/index.ts");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects path exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
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
      expect(schema.safeParse(["--port=3000", "VERBOSE=1"]).success).toBe(true);
    });
  });
});
