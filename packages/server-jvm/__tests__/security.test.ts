/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in JVM tools (Gradle & Maven).
 *
 * These tools accept user-provided strings (task names, goal names, filter
 * patterns, configuration names) that are passed as positional arguments to
 * gradle/mvn. Without validation, a malicious input like "--init-script=..."
 * could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--init-script=evil.gradle",
  "--project-dir=/tmp/evil",
  "-P",
  "--system-prop",
  "--daemon",
  "--no-daemon",
  "-Dexec.mainClass=Evil",
  "--settings=/etc/passwd",
  "-X",
  "--debug",
  "--offline",
  // Whitespace bypass attempts
  " --init-script",
  "\t--project-dir",
  "   -P",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "build",
  "test",
  "clean",
  "assemble",
  "check",
  "compileJava",
  "package",
  "install",
  "verify",
  "deploy",
  "compileClasspath",
  "runtimeClasspath",
  "com.example.MyTest",
  "MyTest#testMethod",
];

// ---------------------------------------------------------------------------
// Gradle tools — flag injection
// ---------------------------------------------------------------------------

describe("security: gradle-build — task validation", () => {
  it("rejects flag-like task names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "task")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe task names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "task")).not.toThrow();
    }
  });
});

describe("security: gradle-test — filter validation", () => {
  it("rejects flag-like filter patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "filter")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe filter patterns", () => {
    const safeFilters = ["com.example.MyTest", "MyTest", "com.example.*", "MyTest.testMethod"];
    for (const safe of safeFilters) {
      expect(() => assertNoFlagInjection(safe, "filter")).not.toThrow();
    }
  });
});

describe("security: gradle-dependencies — configuration validation", () => {
  it("rejects flag-like configuration names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "configuration")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe configuration names", () => {
    const safeConfigs = [
      "compileClasspath",
      "runtimeClasspath",
      "testCompileClasspath",
      "implementation",
      "api",
    ];
    for (const safe of safeConfigs) {
      expect(() => assertNoFlagInjection(safe, "configuration")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Maven tools — flag injection
// ---------------------------------------------------------------------------

describe("security: maven-build — goal validation", () => {
  it("rejects flag-like goal names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "goal")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe goal names", () => {
    const safeGoals = [
      "package",
      "install",
      "deploy",
      "clean",
      "compile",
      "test",
      "verify",
      "site",
      "dependency:tree",
    ];
    for (const safe of safeGoals) {
      expect(() => assertNoFlagInjection(safe, "goal")).not.toThrow();
    }
  });
});

describe("security: maven-test — filter validation", () => {
  it("rejects flag-like filter patterns", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "filter")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe filter patterns", () => {
    const safeFilters = ["com.example.MyTest", "MyTest", "com.example.*", "MyTest#testMethod"];
    for (const safe of safeFilters) {
      expect(() => assertNoFlagInjection(safe, "filter")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// assertNoFlagInjection — general properties
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection — includes parameter name in error", () => {
  it("includes the parameter name in the error message", () => {
    expect(() => assertNoFlagInjection("--evil", "task")).toThrow(/task/);
    expect(() => assertNoFlagInjection("--evil", "goal")).toThrow(/goal/);
    expect(() => assertNoFlagInjection("--evil", "filter")).toThrow(/filter/);
    expect(() => assertNoFlagInjection("--evil", "configuration")).toThrow(/configuration/);
  });

  it("includes the invalid value in the error message", () => {
    expect(() => assertNoFlagInjection("--init-script=evil.gradle", "task")).toThrow(
      /--init-script=evil.gradle/,
    );
    expect(() => assertNoFlagInjection("-P", "goal")).toThrow(/-P/);
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — JVM tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — JVM tool schemas", () => {
  describe("tasks/goals array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `task${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects task/goal name exceeding SHORT_STRING_MAX", () => {
      const oversized = ["t".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal task/goal names", () => {
      expect(schema.safeParse(["build", "test", "clean"]).success).toBe(true);
    });
  });

  describe("filter parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a filter within the limit", () => {
      expect(schema.safeParse("com.example.MyTest").success).toBe(true);
    });

    it("rejects a filter exceeding STRING_MAX", () => {
      const oversized = "f".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("configuration parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a configuration within the limit", () => {
      expect(schema.safeParse("compileClasspath").success).toBe(true);
    });

    it("rejects a configuration exceeding SHORT_STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `arg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects arg exceeding STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["clean", "build"]).success).toBe(true);
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
