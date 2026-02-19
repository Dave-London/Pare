/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Terraform tools.
 *
 * These tools accept user-provided strings (workspace names, target resources,
 * file paths) that are passed as positional arguments to terraform. Without
 * validation, a malicious input like "--auto-approve" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--auto-approve",
  "-destroy",
  "--target=malicious",
  "-var",
  "--var-file=/etc/passwd",
  "-input=true",
  "--migrate-state",
  // Whitespace bypass attempts
  " --auto-approve",
  "\t-destroy",
  "   --target",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "default",
  "staging",
  "production",
  "my-workspace",
  "dev_environment",
  "aws_instance.web",
  "module.vpc.aws_subnet.public",
  "terraform.tfplan",
  "vars/prod.tfvars",
];

describe("security: terraform workspace — name validation", () => {
  it("rejects flag-like workspace names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "name")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe workspace names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "name")).not.toThrow();
    }
  });
});

describe("security: terraform plan — target validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "target")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe resource addresses", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "target")).not.toThrow();
    }
  });
});

describe("security: terraform show — planFile validation", () => {
  it("rejects flag-like plan file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "planFile")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe plan file paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "planFile")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Infra tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Infra tool schemas", () => {
  describe("workspace name (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a name within the limit", () => {
      expect(schema.safeParse("staging").success).toBe(true);
    });

    it("rejects a name exceeding SHORT_STRING_MAX", () => {
      const oversized = "w".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/terraform").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("target parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a target within the limit", () => {
      expect(schema.safeParse("aws_instance.web").success).toBe(true);
    });

    it("rejects a target exceeding STRING_MAX", () => {
      const oversized = "t".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
