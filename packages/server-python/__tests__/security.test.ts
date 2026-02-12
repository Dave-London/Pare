/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Python tools.
 *
 * These tools accept user-provided strings (file targets, marker expressions,
 * package names, requirements paths) that are passed as positional arguments
 * to Python CLI tools. Without validation, a malicious input like
 * "--output=/etc/passwd" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--output=/etc/passwd",
  "-c",
  "--config",
  "--install-option",
  "--global-option",
  "-e",
  "--editable",
  "--pre",
  "--force-reinstall",
  // Whitespace bypass attempts
  " --output",
  "\t-c",
  "   --config",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "tests/",
  "src/mymodule",
  "test_file.py",
  ".",
  "requests",
  "flask",
  "numpy>=1.0",
  "requirements.txt",
  "not slow",
  "src/",
];

describe("security: pytest — targets and markers validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe targets", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "targets")).not.toThrow();
    }
  });

  it("rejects flag-like markers", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "markers")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: black — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe targets", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "targets")).not.toThrow();
    }
  });
});

describe("security: mypy — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: ruff — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: pip-install — packages and requirements validation", () => {
  it("rejects flag-like packages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe packages", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });

  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe requirements paths", () => {
    expect(() => assertNoFlagInjection("requirements.txt", "requirements")).not.toThrow();
    expect(() => assertNoFlagInjection("reqs/dev.txt", "requirements")).not.toThrow();
  });
});

describe("security: pip-audit — requirements validation", () => {
  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: uv-install — packages and requirements validation", () => {
  it("rejects flag-like packages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});
