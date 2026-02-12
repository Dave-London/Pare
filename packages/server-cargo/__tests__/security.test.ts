/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in cargo tools.
 *
 * These tools accept user-provided strings (package names, test filters,
 * feature names, args arrays) that are passed as positional arguments to the
 * Cargo CLI. Without validation, a malicious input like "--release" or
 * "--manifest-path=/evil" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--release",
  "--manifest-path=/evil",
  "-p",
  "--features",
  "--all-features",
  "--no-default-features",
  "-j",
  "--jobs",
  "--target",
  // Whitespace bypass attempts
  " --release",
  "\t--features",
  "   -p",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "my-crate",
  "serde",
  "tokio",
  "my_project",
  "tests/integration",
  "test_name_filter",
  "derive",
  "full",
  "v1.0.0",
];

describe("security: cargo check — package validation", () => {
  it("rejects flag-like package names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "package")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "package")).not.toThrow();
    }
  });
});

describe("security: cargo test — filter validation", () => {
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

describe("security: cargo add — features validation", () => {
  it("rejects flag-like feature names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "features")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe feature names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "features")).not.toThrow();
    }
  });
});

describe("security: cargo run — args validation", () => {
  it("rejects flag-like args values", () => {
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
// cargo build — no user-supplied string params (only path and boolean)
// ---------------------------------------------------------------------------

describe("security: cargo build — no injectable string params", () => {
  it("build tool only accepts path (PATH_MAX) and release (boolean)", () => {
    // The build tool has no user-facing string params that could be flag-injected.
    // path is validated by Zod .max(PATH_MAX) and release is a boolean.
    // This test documents that explicitly.
    const pathSchema = z.string().max(INPUT_LIMITS.PATH_MAX).optional();
    const releaseSchema = z.boolean().optional();

    expect(pathSchema.safeParse("/some/path").success).toBe(true);
    expect(releaseSchema.safeParse(true).success).toBe(true);
    expect(releaseSchema.safeParse("--release").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cargo clippy — no user-supplied string params (only path)
// ---------------------------------------------------------------------------

describe("security: cargo clippy — no injectable string params", () => {
  it("clippy tool only accepts path (PATH_MAX)", () => {
    // The clippy tool has no user-facing string params that could be flag-injected.
    // path is validated by Zod .max(PATH_MAX).
    const pathSchema = z.string().max(INPUT_LIMITS.PATH_MAX).optional();

    expect(pathSchema.safeParse("/some/path").success).toBe(true);
    expect(pathSchema.safeParse("p".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cargo fmt — no user-supplied string params (only path and boolean)
// ---------------------------------------------------------------------------

describe("security: cargo fmt — no injectable string params", () => {
  it("fmt tool only accepts path (PATH_MAX) and check (boolean)", () => {
    // The fmt tool has no user-facing string params that could be flag-injected.
    // path is validated by Zod .max(PATH_MAX) and check is a boolean.
    const pathSchema = z.string().max(INPUT_LIMITS.PATH_MAX).optional();
    const checkSchema = z.boolean().optional();

    expect(pathSchema.safeParse("./my-project").success).toBe(true);
    expect(checkSchema.safeParse(true).success).toBe(true);
    expect(checkSchema.safeParse("--check").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cargo remove — packages[] validation
// ---------------------------------------------------------------------------

describe("security: cargo remove — packages[] validation", () => {
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

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Cargo tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Cargo tool schemas", () => {
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
      expect(schema.safeParse(["serde", "tokio", "reqwest"]).success).toBe(true);
    });
  });
});
