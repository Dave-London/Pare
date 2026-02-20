import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

// ── Target pattern validation ────────────────────────────────────────

describe("Bazel target pattern validation", () => {
  function validateTarget(t: string): void {
    assertNoFlagInjection(t, "targets");
    if (!t.startsWith("//") && !t.startsWith("@") && t !== "...") {
      throw new Error(`Invalid Bazel target pattern: "${t}". Must start with //, @, or be "..."`);
    }
  }

  it("accepts valid target patterns", () => {
    expect(() => validateTarget("//src:app")).not.toThrow();
    expect(() => validateTarget("//...")).not.toThrow();
    expect(() => validateTarget("//src/...")).not.toThrow();
    expect(() => validateTarget("@repo//src:lib")).not.toThrow();
    expect(() => validateTarget("...")).not.toThrow();
  });

  it("rejects invalid target patterns", () => {
    expect(() => validateTarget("rm -rf /")).toThrow();
    expect(() => validateTarget("src:app")).toThrow(/Invalid Bazel target pattern/);
    expect(() => validateTarget("just-a-string")).toThrow(/Invalid Bazel target pattern/);
  });

  it("rejects flag injection in targets", () => {
    expect(() => validateTarget("--config=evil")).toThrow();
    expect(() => validateTarget("-exec")).toThrow();
  });
});

// ── assertNoFlagInjection on inputs ──────────────────────────────────

describe("assertNoFlagInjection on bazel inputs", () => {
  it("rejects flags in queryExpr", () => {
    expect(() => assertNoFlagInjection("--output=evil", "queryExpr")).toThrow();
  });

  it("allows valid query expressions", () => {
    expect(() => assertNoFlagInjection("deps(//src:app)", "queryExpr")).not.toThrow();
    expect(() => assertNoFlagInjection("kind('cc_library', //src/...)", "queryExpr")).not.toThrow();
  });

  it("rejects flags in infoKey", () => {
    expect(() => assertNoFlagInjection("--exec", "infoKey")).toThrow();
  });

  it("allows valid info keys", () => {
    expect(() => assertNoFlagInjection("bazel-bin", "infoKey")).not.toThrow();
    expect(() => assertNoFlagInjection("workspace", "infoKey")).not.toThrow();
    expect(() => assertNoFlagInjection("execution_root", "infoKey")).not.toThrow();
  });
});

// ── Zod schema limits ────────────────────────────────────────────────

describe("Zod schema limits", () => {
  it("rejects targets array exceeding max", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(50);
    const oversized = Array.from({ length: 51 }, (_, i) => `//src:target_${i}`);
    const result = schema.safeParse(oversized);
    expect(result.success).toBe(false);
  });

  it("rejects excessively long target string", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);
    const longStr = "a".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
    const result = schema.safeParse(longStr);
    expect(result.success).toBe(false);
  });

  it("rejects excessively long queryExpr", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);
    const longStr = "a".repeat(INPUT_LIMITS.STRING_MAX + 1);
    const result = schema.safeParse(longStr);
    expect(result.success).toBe(false);
  });
});
