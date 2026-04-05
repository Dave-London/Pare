import { describe, it, expect } from "vitest";
import { z } from "zod";
import { strictifyInputSchema } from "../src/strict-input.js";

describe("strictifyInputSchema", () => {
  it("converts a raw shape to a strict Zod object that rejects unknown keys", () => {
    const shape = {
      path: z.string().optional(),
      maxCount: z.number().optional(),
    };

    const strict = strictifyInputSchema(shape);

    // Should now be a Zod schema (not a raw shape)
    expect(strict).toHaveProperty("_zod");

    // Valid input should parse
    const valid = z.safeParse(strict as z.ZodType, { path: "/tmp", maxCount: 5 });
    expect(valid.success).toBe(true);

    // Unknown keys should be rejected
    const invalid = z.safeParse(strict as z.ZodType, {
      path: "/tmp",
      branch: "main", // unknown key
    });
    expect(invalid.success).toBe(false);
  });

  it("applies .strict() to an existing Zod object schema", () => {
    const obj = z.object({
      name: z.string(),
    });

    const strict = strictifyInputSchema(obj);

    // Valid input should parse
    const valid = z.safeParse(strict as z.ZodType, { name: "test" });
    expect(valid.success).toBe(true);

    // Unknown keys should be rejected
    const invalid = z.safeParse(strict as z.ZodType, {
      name: "test",
      extra: true,
    });
    expect(invalid.success).toBe(false);
  });

  it("returns falsy values unchanged", () => {
    expect(strictifyInputSchema(undefined)).toBeUndefined();
    expect(strictifyInputSchema(null)).toBeNull();
  });

  it("handles empty shapes (tools with no parameters)", () => {
    const shape = {};
    const strict = strictifyInputSchema(shape);

    // Empty object should pass
    const valid = z.safeParse(strict as z.ZodType, {});
    expect(valid.success).toBe(true);

    // Any key should be rejected
    const invalid = z.safeParse(strict as z.ZodType, { foo: "bar" });
    expect(invalid.success).toBe(false);
  });

  it("preserves schema descriptions on shape values", () => {
    const shape = {
      ref: z.string().optional().describe("Branch or tag"),
    };

    const strict = strictifyInputSchema(shape);
    expect(strict).toHaveProperty("_zod");
  });

  it("coerces string 'true'/'false' to booleans for boolean fields", () => {
    const shape = {
      compact: z.boolean().optional().default(true),
      force: z.boolean().optional(),
    };

    const strict = strictifyInputSchema(shape);

    // String "false" should be coerced to boolean false
    const r1 = z.safeParse(strict as z.ZodType, { compact: "false" });
    expect(r1.success).toBe(true);
    if (r1.success) expect(r1.data.compact).toBe(false);

    // String "true" should be coerced to boolean true
    const r2 = z.safeParse(strict as z.ZodType, { force: "true" });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.force).toBe(true);

    // Actual booleans still work
    const r3 = z.safeParse(strict as z.ZodType, { compact: false, force: true });
    expect(r3.success).toBe(true);
    if (r3.success) {
      expect(r3.data.compact).toBe(false);
      expect(r3.data.force).toBe(true);
    }
  });

  it("does not coerce strings for non-boolean fields", () => {
    const shape = {
      name: z.string(),
      count: z.number(),
    };

    const strict = strictifyInputSchema(shape);

    // Strings should remain strings, not be coerced
    const r = z.safeParse(strict as z.ZodType, { name: "true", count: 5 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("true");
  });
});
