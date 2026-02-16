/**
 * Security tests: verify that Zod input constraints are properly enforced
 * on user-supplied parameters in the process run tool.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { INPUT_LIMITS } from "@paretools/shared";

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Process tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Process tool schemas", () => {
  describe("command parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a command within the limit", () => {
      expect(schema.safeParse("node").success).toBe(true);
    });

    it("rejects a command exceeding SHORT_STRING_MAX", () => {
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
      expect(schema.safeParse(["--version", "-e", "console.log('hi')"]).success).toBe(true);
    });
  });

  describe("cwd parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("timeout parameter", () => {
    const schema = z.number().int().min(1).max(600_000);

    it("accepts valid timeout", () => {
      expect(schema.safeParse(30_000).success).toBe(true);
    });

    it("rejects timeout below minimum", () => {
      expect(schema.safeParse(0).success).toBe(false);
    });

    it("rejects timeout above maximum", () => {
      expect(schema.safeParse(600_001).success).toBe(false);
    });

    it("rejects non-integer timeout", () => {
      expect(schema.safeParse(1.5).success).toBe(false);
    });
  });

  describe("env parameter (record of strings)", () => {
    const schema = z.record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX));

    it("accepts valid env vars", () => {
      expect(schema.safeParse({ NODE_ENV: "production", PORT: "3000" }).success).toBe(true);
    });

    it("rejects value exceeding STRING_MAX", () => {
      const oversized = { KEY: "v".repeat(INPUT_LIMITS.STRING_MAX + 1) };
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("shell parameter (boolean)", () => {
    const schema = z.boolean().optional().default(false);

    it("accepts true", () => {
      expect(schema.safeParse(true).success).toBe(true);
    });

    it("accepts false", () => {
      expect(schema.safeParse(false).success).toBe(true);
    });

    it("defaults to false when undefined", () => {
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it("rejects non-boolean", () => {
      expect(schema.safeParse("true").success).toBe(false);
    });
  });

  describe("stripEnv parameter (boolean)", () => {
    const schema = z.boolean().optional().default(false);

    it("accepts true", () => {
      expect(schema.safeParse(true).success).toBe(true);
    });

    it("accepts false", () => {
      expect(schema.safeParse(false).success).toBe(true);
    });

    it("defaults to false when undefined", () => {
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it("rejects non-boolean", () => {
      expect(schema.safeParse(42).success).toBe(false);
    });
  });
});
