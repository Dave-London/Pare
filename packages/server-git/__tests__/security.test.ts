/**
 * Security tests: verify that assertNoFlagInjection() prevents
 * flag-injection attacks in all write tools' user-facing string inputs.
 *
 * Each write tool validates user-supplied strings (file paths, commit
 * messages, remote names, branch names, refs) before passing them to git.
 * These tests ensure that values starting with "-" are rejected.
 */
import { describe, it, expect } from "vitest";
import { assertNoFlagInjection } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--force",
  "--amend",
  "-rf",
  "--no-verify",
  "--exec=rm -rf /",
  "-u",
  "--delete",
  "--hard",
  "--output=/etc/passwd",
  "-D",
  "--set-upstream",
  "--all",
  "-m",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "main",
  "feature/auth",
  "src/index.ts",
  "origin",
  "Fix the bug",
  "v1.0.0",
  "my-branch",
  "README.md",
  "file with spaces.ts",
  "path/to/file.ts",
];

describe("assertNoFlagInjection", () => {
  describe("rejects all flag-like inputs", () => {
    for (const input of MALICIOUS_INPUTS) {
      it(`throws for "${input}"`, () => {
        expect(() => assertNoFlagInjection(input, "test param")).toThrow(
          /must not start with "-"/,
        );
      });
    }
  });

  describe("accepts safe inputs", () => {
    for (const input of SAFE_INPUTS) {
      it(`passes for "${input}"`, () => {
        expect(() => assertNoFlagInjection(input, "test param")).not.toThrow();
      });
    }
  });

  it("includes the parameter name in the error message", () => {
    expect(() => assertNoFlagInjection("--force", "branch")).toThrow(/branch/);
    expect(() => assertNoFlagInjection("--force", "commit message")).toThrow(/commit message/);
    expect(() => assertNoFlagInjection("--force", "remote")).toThrow(/remote/);
  });

  it("includes the invalid value in the error message", () => {
    expect(() => assertNoFlagInjection("--force", "ref")).toThrow(/--force/);
    expect(() => assertNoFlagInjection("-rf", "file path")).toThrow(/-rf/);
  });
});

describe("security: add tool — file path validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "file path")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: commit tool — message validation", () => {
  it("rejects flag-like commit messages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "commit message")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: push tool — remote and branch validation", () => {
  it("rejects flag-like remote names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "remote")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: pull tool — remote and branch validation", () => {
  it("rejects flag-like remote names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "remote")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: checkout tool — ref validation", () => {
  it("rejects flag-like refs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "ref")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: diff tool — ref validation", () => {
  it("rejects flag-like refs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "ref")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});
