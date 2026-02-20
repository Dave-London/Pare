/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in deno tools.
 *
 * These tools accept user-provided strings (file paths, task names, module
 * specifiers) that are passed as positional arguments to Deno CLI commands.
 * Without validation, a malicious input like "--allow-all" could be interpreted
 * as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--allow-read",
  "--allow-write",
  "--allow-net",
  "--allow-env",
  "--allow-all",
  "-A",
  "--config",
  "--import-map",
  "--lock",
  "--unstable",
  "--json",
  // Whitespace bypass attempts
  " --allow-read",
  "\t--config",
  "   -A",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "main.ts",
  "src/server.ts",
  "./test.ts",
  "mod.ts",
  "https://deno.land/std/http/server.ts",
  "npm:chalk",
  "src/",
  ".",
];

describe("security: deno run — file validation", () => {
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

describe("security: deno test — filter validation", () => {
  it("rejects flag-like filter patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "filter")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe filter patterns", () => {
    const safeFilters = ["test_name", "my_test", "integration", "unit"];
    for (const safe of safeFilters) {
      expect(() => assertNoFlagInjection(safe, "filter")).not.toThrow();
    }
  });
});

describe("security: deno test — files validation", () => {
  it("rejects flag-like file patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe file patterns", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "files")).not.toThrow();
    }
  });
});

describe("security: deno fmt — files validation", () => {
  it("rejects flag-like file patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: deno lint — files validation", () => {
  it("rejects flag-like file patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: deno lint — rules validation", () => {
  it("rejects flag-like rule names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "rules")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe rule names", () => {
    const safeRules = ["no-unused-vars", "no-explicit-any", "prefer-const"];
    for (const safe of safeRules) {
      expect(() => assertNoFlagInjection(safe, "rules")).not.toThrow();
    }
  });
});

describe("security: deno check — files validation", () => {
  it("rejects flag-like file patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "files")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: deno task — name validation", () => {
  it("rejects flag-like task names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "name")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe task names", () => {
    const safeTasks = ["build", "test", "dev", "start", "lint"];
    for (const safe of safeTasks) {
      expect(() => assertNoFlagInjection(safe, "name")).not.toThrow();
    }
  });
});

describe("security: deno info — module validation", () => {
  it("rejects flag-like module specifiers", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "module")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe module specifiers", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "module")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Deno tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Deno tool schemas", () => {
  describe("files array (ARRAY_MAX + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "src/");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects file string exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal file patterns", () => {
      expect(schema.safeParse(["src/", "test/", "*.ts"]).success).toBe(true);
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

  describe("task name (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a normal task name", () => {
      expect(schema.safeParse("build").success).toBe(true);
    });

    it("rejects an oversized task name", () => {
      const oversized = "t".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
