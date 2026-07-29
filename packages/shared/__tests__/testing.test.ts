import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  toolOutputJsonSchema,
  validateToolOutput,
  expectToolOutputMatchesSchema,
} from "../src/testing.js";

describe("toolOutputJsonSchema", () => {
  it("emits additionalProperties: false for plain z.object (SDK behavior)", () => {
    const schema = toolOutputJsonSchema(z.object({ a: z.string() })) as Record<string, unknown>;
    expect(schema.additionalProperties).toBe(false);
  });

  it("keeps passthrough objects open", () => {
    const schema = toolOutputJsonSchema(z.object({ action: z.string() }).passthrough()) as Record<
      string,
      unknown
    >;
    expect(schema.additionalProperties).not.toBe(false);
  });
});

describe("validateToolOutput", () => {
  const schema = z.object({
    success: z.boolean(),
    total: z.number().optional(),
  });

  it("accepts payloads with only declared fields", () => {
    expect(validateToolOutput(schema, { success: true, total: 3 })).toEqual({ valid: true });
  });

  it("rejects undeclared fields the way the MCP client does (-32602)", () => {
    const result = validateToolOutput(schema, { success: true, sneaky: 1 });
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/additional properties/i);
  });

  it("rejects missing required fields", () => {
    const result = validateToolOutput(schema, { total: 3 });
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/required/i);
  });

  it("ignores undefined-valued keys (JSON wire round-trip)", () => {
    // In-process objects may carry `key: undefined`; on the wire those keys
    // disappear, so they must not fail validation.
    expect(validateToolOutput(schema, { success: true, total: undefined }).valid).toBe(true);
  });

  it("allows catchall'd extra keys of the declared type", () => {
    const open = z.object({ success: z.boolean() }).catchall(z.string());
    expect(validateToolOutput(open, { success: true, GOCACHE: "/tmp/cache" }).valid).toBe(true);
    expect(validateToolOutput(open, { success: true, GOCACHE: 42 }).valid).toBe(false);
  });
});

describe("expectToolOutputMatchesSchema", () => {
  it("throws with the AJV detail on mismatch", () => {
    expect(() =>
      expectToolOutputMatchesSchema(z.object({ a: z.string() }), { a: "x", b: 1 }),
    ).toThrow(/additional properties/i);
  });

  it("does not throw on a valid payload", () => {
    expect(() =>
      expectToolOutputMatchesSchema(z.object({ a: z.string() }), { a: "x" }),
    ).not.toThrow();
  });
});
