/**
 * Converts a raw Zod shape (used as `inputSchema` in tool registration) into
 * a strict Zod object schema that rejects unrecognized properties.
 *
 * By default the MCP SDK wraps raw shapes with `z.object(shape)` which
 * silently strips unknown keys. This causes confusing errors when an AI agent
 * passes a wrong-but-plausible parameter name (e.g. `branch` instead of `ref`).
 *
 * Applying `z.strictObject(shape)` instead causes validation to fail with a
 * clear error message listing the unrecognized key.
 */

import { z } from "zod";

/**
 * Checks whether a value is a Zod schema instance (has `_zod` for v4).
 */
function isZodSchema(value: unknown): boolean {
  return typeof value === "object" && value !== null && ("_zod" in value || "_def" in value);
}

/**
 * Checks whether a value is a "raw shape" — a plain object whose values are
 * Zod schemas. This is the shorthand form used by all Pare tools:
 * `{ path: z.string(), maxCount: z.number() }`.
 */
function isRawShape(value: unknown): value is Record<string, z.ZodType> {
  if (typeof value !== "object" || value === null) return false;
  // If it's already a Zod schema instance, it's NOT a raw shape
  if (isZodSchema(value)) return false;
  const entries = Object.values(value);
  // Empty shape is valid (tools with no parameters)
  if (entries.length === 0) return true;
  // A raw shape has values that are Zod schemas
  return entries.some((v) => isZodSchema(v));
}

/**
 * If `schema` is a raw Zod shape, wraps it in `z.strictObject()` so that
 * unknown parameters are rejected during validation. If the schema is already
 * a Zod schema instance, applies `.strict()` if it's an object schema.
 * Otherwise returns the schema unchanged.
 */
export function strictifyInputSchema<T>(schema: T): T {
  if (!schema) return schema;

  if (isRawShape(schema)) {
    // Convert raw shape to strict object schema.
    // The MCP SDK's normalizeObjectSchema will recognize this as a pre-built
    // Zod v4 schema and use it directly instead of wrapping in z.object().
    return z.strictObject(schema as Record<string, z.ZodType>) as unknown as T;
  }

  // If it's already a Zod object schema, apply .strict()
  const schemaObj = schema as Record<string, unknown>;
  if (isZodSchema(schema) && typeof schemaObj.strict === "function") {
    return (schemaObj.strict as () => unknown)() as T;
  }

  return schema;
}
