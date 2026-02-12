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
import { assertNoFlagInjection } from "@paretools/shared";

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
