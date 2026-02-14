/**
 * Security tests: verify that Zod input constraints are properly enforced
 * on user-supplied parameters in the security tools (trivy, semgrep, gitleaks).
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { INPUT_LIMITS } from "@paretools/shared";

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Security tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Security tool schemas", () => {
  describe("trivy target parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a target within the limit", () => {
      expect(schema.safeParse("alpine:3.18").success).toBe(true);
    });

    it("accepts a filesystem path", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a target exceeding PATH_MAX", () => {
      const oversized = "a".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("trivy severity parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a valid severity string", () => {
      expect(schema.safeParse("CRITICAL,HIGH").success).toBe(true);
    });

    it("rejects a severity exceeding SHORT_STRING_MAX", () => {
      const oversized = "S".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("trivy scanType parameter (enum)", () => {
    const schema = z.enum(["image", "fs", "config"]);

    it("accepts valid scan types", () => {
      expect(schema.safeParse("image").success).toBe(true);
      expect(schema.safeParse("fs").success).toBe(true);
      expect(schema.safeParse("config").success).toBe(true);
    });

    it("rejects invalid scan types", () => {
      expect(schema.safeParse("malicious").success).toBe(false);
      expect(schema.safeParse("").success).toBe(false);
    });
  });

  describe("trivy path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "/".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("semgrep patterns array (ARRAY_MAX + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("accepts valid patterns", () => {
      expect(schema.safeParse([".", "src/", "lib/"]).success).toBe(true);
    });

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => ".");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects pattern string exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("semgrep config parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts valid config strings", () => {
      expect(schema.safeParse("auto").success).toBe(true);
      expect(schema.safeParse("p/security-audit").success).toBe(true);
      expect(schema.safeParse("p/owasp-top-ten").success).toBe(true);
    });

    it("rejects config exceeding SHORT_STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("gitleaks path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/repo").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "d".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
