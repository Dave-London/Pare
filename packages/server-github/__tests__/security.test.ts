/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in GitHub tools.
 *
 * These tools accept user-provided strings (titles, branch names, authors,
 * labels, assignees) that are passed as arguments to the gh CLI. Without
 * validation, a malicious input like "--exec=rm -rf /" could be interpreted
 * as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--exec=rm -rf /",
  "-v",
  "--json",
  "--jq",
  "--template",
  "--web",
  "-w",
  "--repo",
  "-R",
  // Whitespace bypass attempts
  " --exec",
  "\t-v",
  "   --json",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "fix bug in auth",
  "alice",
  "feat/new-feature",
  "main",
  "bug",
  "priority:high",
  "v1.0.0",
  "good first issue",
];

describe("security: pr-create — title validation", () => {
  it("rejects flag-like titles", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "title")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe titles", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "title")).not.toThrow();
    }
  });
});

describe("security: pr-create — base branch validation", () => {
  it("rejects flag-like base branches", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "base")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe branch names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "base")).not.toThrow();
    }
  });
});

describe("security: pr-create — head branch validation", () => {
  it("rejects flag-like head branches", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "head")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: pr-list — author validation", () => {
  it("rejects flag-like authors", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "author")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe author names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "author")).not.toThrow();
    }
  });
});

describe("security: pr-list / issue-list — label validation", () => {
  it("rejects flag-like labels", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "label")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe labels", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "label")).not.toThrow();
    }
  });
});

describe("security: issue-list — assignee validation", () => {
  it("rejects flag-like assignees", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "assignee")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe assignee names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "assignee")).not.toThrow();
    }
  });
});

describe("security: issue-create — labels array validation", () => {
  it("rejects flag-like labels in array", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "labels")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: issue-create — title validation", () => {
  it("rejects flag-like titles", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "title")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: run-list — branch validation", () => {
  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe branch names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "branch")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — GitHub tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — GitHub tool schemas", () => {
  describe("title (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a title within the limit", () => {
      expect(schema.safeParse("Fix auth bug").success).toBe(true);
    });

    it("rejects a title exceeding SHORT_STRING_MAX", () => {
      const oversized = "T".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("body (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a body within the limit", () => {
      expect(schema.safeParse("Description of the issue.").success).toBe(true);
    });

    it("rejects a body exceeding STRING_MAX", () => {
      const oversized = "B".repeat(INPUT_LIMITS.STRING_MAX + 1);
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

  describe("labels array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `label${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects label exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal labels", () => {
      expect(schema.safeParse(["bug", "enhancement", "good first issue"]).success).toBe(true);
    });
  });
});
