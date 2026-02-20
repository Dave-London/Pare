import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, assertAllowedByPolicy, INPUT_LIMITS } from "@paretools/shared";

// ── Cache variable key validation ──────────────────────────────────

describe("cache variable key validation", () => {
  const keyRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;

  it("accepts valid cache variable keys", () => {
    expect(keyRegex.test("CMAKE_BUILD_TYPE")).toBe(true);
    expect(keyRegex.test("MY_VAR")).toBe(true);
    expect(keyRegex.test("_PRIVATE")).toBe(true);
    expect(keyRegex.test("foo123")).toBe(true);
  });

  it("rejects invalid cache variable keys", () => {
    expect(keyRegex.test("")).toBe(false);
    expect(keyRegex.test("123ABC")).toBe(false);
    expect(keyRegex.test("VAR-NAME")).toBe(false);
    expect(keyRegex.test("VAR.NAME")).toBe(false);
    expect(keyRegex.test("VAR NAME")).toBe(false);
  });

  it("rejects injection attempt: CMAKE_C_COMPILER && rm -rf /", () => {
    expect(keyRegex.test("CMAKE_C_COMPILER && rm -rf /")).toBe(false);
  });

  it("rejects key with semicolons", () => {
    expect(keyRegex.test("VAR;rm -rf /")).toBe(false);
  });

  it("rejects key with special characters", () => {
    expect(keyRegex.test("VAR=$(whoami)")).toBe(false);
    expect(keyRegex.test("VAR`id`")).toBe(false);
    expect(keyRegex.test("VAR|cat /etc/passwd")).toBe(false);
  });
});

// ── assertNoFlagInjection on cmake inputs ──────────────────────────

describe("assertNoFlagInjection on cmake inputs", () => {
  it("allows normal sourceDir", () => {
    expect(() => assertNoFlagInjection("/home/user/project", "sourceDir")).not.toThrow();
    expect(() => assertNoFlagInjection(".", "sourceDir")).not.toThrow();
    expect(() => assertNoFlagInjection("my-project", "sourceDir")).not.toThrow();
  });

  it("rejects flag-like sourceDir", () => {
    expect(() => assertNoFlagInjection("--evil", "sourceDir")).toThrow(/must not start with/);
    expect(() => assertNoFlagInjection("-S", "sourceDir")).toThrow(/must not start with/);
  });

  it("allows normal buildDir", () => {
    expect(() => assertNoFlagInjection("build", "buildDir")).not.toThrow();
    expect(() => assertNoFlagInjection("out/release", "buildDir")).not.toThrow();
  });

  it("rejects flag-like buildDir", () => {
    expect(() => assertNoFlagInjection("--build=/etc", "buildDir")).toThrow(/must not start with/);
  });

  it("allows normal target", () => {
    expect(() => assertNoFlagInjection("all", "target")).not.toThrow();
    expect(() => assertNoFlagInjection("my_lib", "target")).not.toThrow();
  });

  it("rejects flag-like target", () => {
    expect(() => assertNoFlagInjection("--target=evil", "target")).toThrow(/must not start with/);
  });
});

// ── Policy gate for install action ─────────────────────────────────

describe("assertAllowedByPolicy for install", () => {
  it("allows cmake when no policy is set", () => {
    // When no PARE_ALLOWED_COMMANDS or PARE_CMAKE_ALLOWED_COMMANDS is set,
    // assertAllowedByPolicy is a no-op (permissive default)
    expect(() => assertAllowedByPolicy("cmake", "cmake")).not.toThrow();
  });

  it("rejects cmake when policy excludes it", () => {
    const orig = process.env.PARE_CMAKE_ALLOWED_COMMANDS;
    try {
      process.env.PARE_CMAKE_ALLOWED_COMMANDS = "git,npm";
      expect(() => assertAllowedByPolicy("cmake", "cmake")).toThrow(/not allowed/);
    } finally {
      if (orig === undefined) delete process.env.PARE_CMAKE_ALLOWED_COMMANDS;
      else process.env.PARE_CMAKE_ALLOWED_COMMANDS = orig;
    }
  });

  it("allows cmake when policy includes it", () => {
    const orig = process.env.PARE_CMAKE_ALLOWED_COMMANDS;
    try {
      process.env.PARE_CMAKE_ALLOWED_COMMANDS = "cmake,ctest";
      expect(() => assertAllowedByPolicy("cmake", "cmake")).not.toThrow();
    } finally {
      if (orig === undefined) delete process.env.PARE_CMAKE_ALLOWED_COMMANDS;
      else process.env.PARE_CMAKE_ALLOWED_COMMANDS = orig;
    }
  });
});

// ── Zod .max() input-limit constraints ─────────────────────────────

describe("Zod .max() constraints — CMake tool schemas", () => {
  describe("sourceDir parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("buildDir parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("build").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "b".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("target array (max 20 items, SHORT_STRING_MAX per item)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(20);

    it("accepts array within limits", () => {
      expect(schema.safeParse(["all", "install"]).success).toBe(true);
    });

    it("rejects array exceeding max 20 items", () => {
      const oversized = Array.from({ length: 21 }, () => "target");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects target string exceeding SHORT_STRING_MAX", () => {
      const oversized = ["t".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
