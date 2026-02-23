/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Nix tools.
 *
 * These tools accept user-provided strings (installable references, flake refs,
 * package names) that are passed as positional arguments to nix. Without
 * validation, a malicious input like "--option=..." could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--option=sandbox false",
  "-f",
  "--file=/etc/passwd",
  "--override-input=nixpkgs /tmp/evil",
  "--impure",
  "--no-sandbox",
  "--command=rm -rf /",
  // Whitespace bypass attempts
  " --option",
  "\t-f",
  "   --impure",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  ".",
  ".#package",
  ".#devShell",
  "nixpkgs#hello",
  "nixpkgs#python3",
  "github:NixOS/nixpkgs#hello",
  "github:numtide/flake-utils",
  "path:/home/user/project",
  "nixpkgs",
  "flake-utils",
];

describe("security: nix build — installable validation", () => {
  it("rejects flag-like installables", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "installable")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe installable values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "installable")).not.toThrow();
    }
  });
});

describe("security: nix flake — flakeRef validation", () => {
  it("rejects flag-like flakeRef values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "flakeRef")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe flakeRef values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "flakeRef")).not.toThrow();
    }
  });
});

describe("security: nix shell — packages validation", () => {
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

describe("security: nix flake update — inputs validation", () => {
  it("rejects flag-like input names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "inputs")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe input names", () => {
    const safeInputNames = ["nixpkgs", "flake-utils", "home-manager", "nix-darwin"];
    for (const safe of safeInputNames) {
      expect(() => assertNoFlagInjection(safe, "inputs")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Nix tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Nix tool schemas", () => {
  describe("installable parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts an installable within the limit", () => {
      expect(schema.safeParse("nixpkgs#hello").success).toBe(true);
    });

    it("rejects an installable exceeding STRING_MAX", () => {
      const oversized = "x".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("packages array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `pkg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects package name exceeding STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal packages", () => {
      expect(schema.safeParse(["nixpkgs#jq", "nixpkgs#curl"]).success).toBe(true);
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

  describe("inputs array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("accepts normal inputs", () => {
      expect(schema.safeParse(["nixpkgs", "flake-utils"]).success).toBe(true);
    });

    it("rejects input name exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
