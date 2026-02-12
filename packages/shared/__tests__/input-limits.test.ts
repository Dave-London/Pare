/**
 * Tests for INPUT_LIMITS Zod `.max()` constraints.
 *
 * Every Pare MCP server applies INPUT_LIMITS from @paretools/shared to Zod
 * schemas via `.max()`. These tests verify that:
 *   - Values at/below the limit pass validation
 *   - Values above the limit are rejected
 *
 * This provides defense-in-depth against DoS via extremely long inputs.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { INPUT_LIMITS } from "../src/limits.js";

describe("INPUT_LIMITS constants", () => {
  it("STRING_MAX is 65,536", () => {
    expect(INPUT_LIMITS.STRING_MAX).toBe(65_536);
  });

  it("ARRAY_MAX is 1,000", () => {
    expect(INPUT_LIMITS.ARRAY_MAX).toBe(1_000);
  });

  it("PATH_MAX is 4,096", () => {
    expect(INPUT_LIMITS.PATH_MAX).toBe(4_096);
  });

  it("MESSAGE_MAX is 72,000", () => {
    expect(INPUT_LIMITS.MESSAGE_MAX).toBe(72_000);
  });

  it("SHORT_STRING_MAX is 255", () => {
    expect(INPUT_LIMITS.SHORT_STRING_MAX).toBe(255);
  });
});

describe("Zod .max() with STRING_MAX (65,536)", () => {
  const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

  it("accepts a string at the limit", () => {
    const value = "a".repeat(INPUT_LIMITS.STRING_MAX);
    const result = schema.safeParse(value);
    expect(result.success).toBe(true);
  });

  it("rejects a string exceeding the limit by 1", () => {
    const value = "a".repeat(INPUT_LIMITS.STRING_MAX + 1);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });

  it("rejects a string 2x the limit", () => {
    const value = "a".repeat(INPUT_LIMITS.STRING_MAX * 2);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });
});

describe("Zod .max() with SHORT_STRING_MAX (255)", () => {
  const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

  it("accepts a string at the limit", () => {
    const value = "x".repeat(INPUT_LIMITS.SHORT_STRING_MAX);
    const result = schema.safeParse(value);
    expect(result.success).toBe(true);
  });

  it("rejects a string exceeding the limit by 1", () => {
    const value = "x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });

  it("accepts typical short identifiers", () => {
    expect(schema.safeParse("main").success).toBe(true);
    expect(schema.safeParse("feature/auth-flow").success).toBe(true);
    expect(schema.safeParse("@types/node").success).toBe(true);
    expect(schema.safeParse("nginx:latest").success).toBe(true);
  });
});

describe("Zod .max() with PATH_MAX (4,096)", () => {
  const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

  it("accepts a path at the limit", () => {
    const value = "/a".repeat(INPUT_LIMITS.PATH_MAX / 2);
    const result = schema.safeParse(value);
    expect(result.success).toBe(true);
  });

  it("rejects a path exceeding the limit by 1", () => {
    const value = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });

  it("accepts typical file paths", () => {
    expect(schema.safeParse("src/index.ts").success).toBe(true);
    expect(schema.safeParse("/usr/local/bin/node").success).toBe(true);
    expect(schema.safeParse("C:\\Users\\user\\project\\src\\file.ts").success).toBe(true);
  });
});

describe("Zod .max() with MESSAGE_MAX (72,000)", () => {
  const schema = z.string().max(INPUT_LIMITS.MESSAGE_MAX);

  it("accepts a message at the limit", () => {
    const value = "m".repeat(INPUT_LIMITS.MESSAGE_MAX);
    const result = schema.safeParse(value);
    expect(result.success).toBe(true);
  });

  it("rejects a message exceeding the limit by 1", () => {
    const value = "m".repeat(INPUT_LIMITS.MESSAGE_MAX + 1);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });

  it("accepts a normal commit message", () => {
    expect(schema.safeParse("Fix the login bug in auth module").success).toBe(true);
  });
});

describe("Zod .max() with ARRAY_MAX (1,000)", () => {
  const schema = z.array(z.string()).max(INPUT_LIMITS.ARRAY_MAX);

  it("accepts an array at the limit", () => {
    const value = Array.from({ length: INPUT_LIMITS.ARRAY_MAX }, (_, i) => `item-${i}`);
    const result = schema.safeParse(value);
    expect(result.success).toBe(true);
  });

  it("rejects an array exceeding the limit by 1", () => {
    const value = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `item-${i}`);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });

  it("accepts a typical small array", () => {
    const result = schema.safeParse(["src/index.ts", "src/app.ts", "README.md"]);
    expect(result.success).toBe(true);
  });
});

describe("Combined schema: array of short strings with limits", () => {
  const schema = z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

  it("accepts valid array of short strings", () => {
    const result = schema.safeParse(["serde", "tokio", "reqwest"]);
    expect(result.success).toBe(true);
  });

  it("rejects when any string element exceeds SHORT_STRING_MAX", () => {
    const result = schema.safeParse(["serde", "x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)]);
    expect(result.success).toBe(false);
  });

  it("rejects when array exceeds ARRAY_MAX", () => {
    const value = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `pkg-${i}`);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
  });
});

describe("Combined schema: array of path strings with limits", () => {
  const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

  it("accepts valid array of paths", () => {
    const result = schema.safeParse(["src/index.ts", "lib/utils.ts"]);
    expect(result.success).toBe(true);
  });

  it("rejects when any path element exceeds PATH_MAX", () => {
    const result = schema.safeParse(["src/index.ts", "p".repeat(INPUT_LIMITS.PATH_MAX + 1)]);
    expect(result.success).toBe(false);
  });
});
