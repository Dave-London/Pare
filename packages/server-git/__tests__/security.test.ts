/**
 * Security tests: verify that assertNoFlagInjection() prevents
 * flag-injection attacks in all write tools' user-facing string inputs.
 *
 * Each write tool validates user-supplied strings (file paths, commit
 * messages, remote names, branch names, refs) before passing them to git.
 * These tests ensure that values starting with "-" are rejected.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

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
  // Whitespace bypass attempts
  " --force",
  "\t--delete",
  "   -rf",
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
        expect(() => assertNoFlagInjection(input, "test param")).toThrow(/must not start with "-"/);
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
      expect(() => assertNoFlagInjection(malicious, "remote")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: pull tool — remote and branch validation", () => {
  it("rejects flag-like remote names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "remote")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: checkout tool — ref validation", () => {
  it("rejects flag-like refs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "ref")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: diff tool — ref validation", () => {
  it("rejects flag-like refs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "ref")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: diff tool — file validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "file")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe file paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "file")).not.toThrow();
    }
  });
});

describe("security: log tool — author validation", () => {
  it("rejects flag-like author values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "author")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe author values", () => {
    const safeAuthors = ["John Doe", "jane@example.com", "user123", "A B"];
    for (const safe of safeAuthors) {
      expect(() => assertNoFlagInjection(safe, "author")).not.toThrow();
    }
  });
});

describe("security: blame tool — file path validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "file")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: stash tool — message validation", () => {
  it("rejects flag-like stash messages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "stash message")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: restore tool — source validation", () => {
  it("rejects flag-like source refs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "source")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe source refs", () => {
    const safeRefs = ["HEAD", "main", "v1.0.0", "abc1234", "feature/branch"];
    for (const safe of safeRefs) {
      expect(() => assertNoFlagInjection(safe, "source")).not.toThrow();
    }
  });
});

describe("security: restore tool — files validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe file paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "files")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Git tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Git tool schemas", () => {
  describe("commit message (MESSAGE_MAX = 72,000)", () => {
    const schema = z.string().max(INPUT_LIMITS.MESSAGE_MAX);

    it("accepts a message at the limit", () => {
      const value = "m".repeat(INPUT_LIMITS.MESSAGE_MAX);
      expect(schema.safeParse(value).success).toBe(true);
    });

    it("rejects a message exceeding MESSAGE_MAX by 1", () => {
      const value = "m".repeat(INPUT_LIMITS.MESSAGE_MAX + 1);
      expect(schema.safeParse(value).success).toBe(false);
    });

    it("accepts a normal commit message", () => {
      expect(schema.safeParse("Fix the login bug").success).toBe(true);
    });
  });

  describe("branch/remote names (SHORT_STRING_MAX = 255)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a branch name within the limit", () => {
      expect(schema.safeParse("feature/auth-flow").success).toBe(true);
    });

    it("rejects a branch name exceeding SHORT_STRING_MAX", () => {
      const oversized = "b".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("file paths (PATH_MAX = 4,096)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a file path within the limit", () => {
      expect(schema.safeParse("src/components/Button.tsx").success).toBe(true);
    });

    it("rejects a file path exceeding PATH_MAX", () => {
      const oversized = "f".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("files array (ARRAY_MAX = 1,000 + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from(
        { length: INPUT_LIMITS.ARRAY_MAX + 1 },
        (_, i) => `file-${i}.ts`,
      );
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects file path exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts a normal file list", () => {
      expect(schema.safeParse(["src/index.ts", "README.md"]).success).toBe(true);
    });
  });
});
