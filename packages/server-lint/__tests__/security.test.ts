/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in lint tools.
 *
 * These tools accept user-provided strings (file patterns) that are passed
 * as positional arguments to lint CLIs (ESLint, Biome, Prettier). Without
 * validation, a malicious input like "--fix-dry-run" could be interpreted
 * as a flag.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--fix",
  "--fix-dry-run",
  "--config",
  "-c",
  "--format",
  "--output-file",
  "--write",
  "--check",
  "--reporter",
  // Whitespace bypass attempts
  " --fix",
  "\t--config",
  "   -c",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  ".",
  "src/",
  "src/**/*.ts",
  "lib/",
  "index.js",
  "components/",
  "*.tsx",
  "app/",
];

describe("security: lint (ESLint) — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe patterns", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "patterns")).not.toThrow();
    }
  });
});

describe("security: biome-check — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe patterns", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "patterns")).not.toThrow();
    }
  });
});

describe("security: biome-format — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: prettier-format — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: format-check (Prettier) — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });
});
