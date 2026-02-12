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
import { assertNoFlagInjection } from "@paretools/shared";

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
