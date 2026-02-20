/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in dotnet tools.
 *
 * These tools accept user-provided strings (project paths, package names,
 * configuration names, framework names, filter expressions) that are passed
 * as positional arguments to the dotnet CLI. Without validation, a malicious
 * input like "--configuration" or "--output=/evil" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--configuration",
  "--output=/evil",
  "-o",
  "--framework",
  "--runtime",
  "--source",
  "--version",
  // Whitespace bypass attempts
  " --configuration",
  "\t--output",
  "   -o",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "MyApp",
  "Newtonsoft.Json",
  "Microsoft.Extensions.Logging",
  "net8.0",
  "Release",
  "Debug",
  "win-x64",
  "linux-x64",
  "13.0.3",
  "tests/MyTest",
  "ClassName.MethodName",
];

describe("security: dotnet build — project validation", () => {
  it("rejects flag-like project paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "project")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe project paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "project")).not.toThrow();
    }
  });
});

describe("security: dotnet build — configuration validation", () => {
  it("rejects flag-like configuration values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "configuration")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe configuration values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "configuration")).not.toThrow();
    }
  });
});

describe("security: dotnet test — filter validation", () => {
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

describe("security: dotnet add-package — package name validation", () => {
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

describe("security: dotnet add-package — version validation", () => {
  it("rejects flag-like version values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "version")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe version values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "version")).not.toThrow();
    }
  });
});

describe("security: dotnet restore — source validation", () => {
  it("rejects flag-like source values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "source")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe source values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "source")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — dotnet tool schemas", () => {
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

  describe("package name (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a normal package name", () => {
      expect(schema.safeParse("Newtonsoft.Json").success).toBe(true);
    });

    it("rejects package name exceeding SHORT_STRING_MAX", () => {
      const oversized = "x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("source array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `src-${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal source arrays", () => {
      expect(schema.safeParse(["https://api.nuget.org/v3/index.json"]).success).toBe(true);
    });
  });
});
