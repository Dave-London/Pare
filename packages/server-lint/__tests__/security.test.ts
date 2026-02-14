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
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

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

describe("security: stylelint — patterns validation", () => {
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

describe("security: oxlint — patterns validation", () => {
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

describe("security: shellcheck — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe shell script patterns", () => {
    const shellSafe = ["deploy.sh", "scripts/build.sh", "*.sh", "ci/"];
    for (const safe of shellSafe) {
      expect(() => assertNoFlagInjection(safe, "patterns")).not.toThrow();
    }
  });
});

describe("security: hadolint — patterns validation", () => {
  it("rejects flag-like patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "patterns")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe Dockerfile patterns", () => {
    const dockerSafe = ["Dockerfile", "Dockerfile.dev", "docker/Dockerfile.prod", "."];
    for (const safe of dockerSafe) {
      expect(() => assertNoFlagInjection(safe, "patterns")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Lint tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Lint tool schemas", () => {
  describe("patterns array (ARRAY_MAX + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "src/");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects pattern string exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal patterns", () => {
      expect(schema.safeParse(["src/", "lib/", "*.ts"]).success).toBe(true);
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
});
