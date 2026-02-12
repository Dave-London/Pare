/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Go tools.
 *
 * These tools accept user-provided strings (package paths, test filters,
 * file patterns, build args) that are passed as positional arguments to the
 * Go CLI. Without validation, a malicious input like "--exec=rm -rf /" could
 * be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--exec=rm -rf /",
  "-race",
  "--tags",
  "-v",
  "--count",
  "--run",
  "-o",
  "--output",
  "--ldflags",
  // Whitespace bypass attempts
  " --exec",
  "\t-race",
  "   --tags",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "./...",
  "./cmd/myapp",
  "mypackage",
  "TestMyFunction",
  "src/main.go",
  ".",
  "internal/utils",
  "v1.0.0",
];

describe("security: go build — packages validation", () => {
  it("rejects flag-like package paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });
});

describe("security: go test — packages and run validation", () => {
  it("rejects flag-like package paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like run filter", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "run")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe run filter values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "run")).not.toThrow();
    }
  });
});

describe("security: go vet — packages validation", () => {
  it("rejects flag-like package paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: go generate — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: go fmt — patterns validation", () => {
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

describe("security: go run — buildArgs validation", () => {
  it("rejects flag-like buildArgs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "buildArgs")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});
