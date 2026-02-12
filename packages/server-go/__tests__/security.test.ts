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
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

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

describe("security: go list — packages validation", () => {
  it("rejects flag-like package patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package patterns", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });
});

describe("security: go get — packages validation", () => {
  it("rejects flag-like package specifiers", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe package specifiers", () => {
    const safePackages = [
      "github.com/pkg/errors@latest",
      "github.com/stretchr/testify@v1.9.0",
      "golang.org/x/tools@latest",
      "./...",
    ];
    for (const safe of safePackages) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Go tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Go tool schemas", () => {
  describe("packages/patterns array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `./pkg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects package path exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal package paths", () => {
      expect(schema.safeParse(["./...", "./cmd/myapp"]).success).toBe(true);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/go/myproject").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("run filter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a filter within the limit", () => {
      expect(schema.safeParse("TestMyFunction").success).toBe(true);
    });

    it("rejects a filter exceeding SHORT_STRING_MAX", () => {
      const oversized = "T".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
