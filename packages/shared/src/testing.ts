/**
 * Test-only helpers that validate tool output the exact way the MCP SDK does
 * at runtime.
 *
 * Why this exists (#1022 regression class): Zod's `.parse()` silently STRIPS
 * unknown keys, so `Schema.parse(compactMap(data))` passes even when a compact
 * mapper emits fields the registered `outputSchema` does not declare. The MCP
 * SDK, however, converts the Zod outputSchema to JSON Schema (where plain
 * `z.object` becomes `additionalProperties: false`) and validates
 * `structuredContent` with AJV on the client side — so undeclared compact-only
 * fields fail at runtime with `MCP error -32602: data must NOT have
 * additional properties`, but only when compact mode engages.
 *
 * These helpers replicate that pipeline (zod v4 `toJSONSchema` with the SDK's
 * options + the SDK's own AJV validator) so unit tests catch the mismatch.
 *
 * Import from `@paretools/shared/testing` — kept out of the main entry point
 * so production servers never load AJV.
 */
import * as z4mini from "zod/v4-mini";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation/types.js";

/** Result of validating a tool output payload against its registered schema. */
export interface ToolOutputValidationResult {
  valid: boolean;
  /** AJV error message when invalid (mirrors the MCP client's -32602 detail). */
  errorMessage?: string;
}

/**
 * Converts a Zod outputSchema to JSON Schema exactly like the MCP SDK does
 * when listing tools (zod v4 branch of `toJsonSchemaCompat`): draft-7 target,
 * output io — which makes plain `z.object` emit `additionalProperties: false`.
 */
export function toolOutputJsonSchema(outputSchema: unknown): JsonSchemaType {
  return z4mini.toJSONSchema(outputSchema as Parameters<typeof z4mini.toJSONSchema>[0], {
    target: "draft-7",
    io: "output",
  }) as JsonSchemaType;
}

/**
 * Validates a structuredContent payload against a tool's registered Zod
 * outputSchema using the SDK's own AJV validator. The payload is JSON
 * round-tripped first to mirror the wire (drops `undefined`-valued keys).
 */
export function validateToolOutput(
  outputSchema: unknown,
  structuredContent: unknown,
): ToolOutputValidationResult {
  const jsonSchema = toolOutputJsonSchema(outputSchema);
  const validate = new AjvJsonSchemaValidator().getValidator(jsonSchema);
  const wireData: unknown = JSON.parse(JSON.stringify(structuredContent));
  const result = validate(wireData);
  return result.valid ? { valid: true } : { valid: false, errorMessage: result.errorMessage };
}

/**
 * Assertion form of {@link validateToolOutput}: throws with the AJV error
 * detail when the payload would be rejected by an MCP client at runtime.
 */
export function expectToolOutputMatchesSchema(
  outputSchema: unknown,
  structuredContent: unknown,
): void {
  const result = validateToolOutput(outputSchema, structuredContent);
  if (!result.valid) {
    throw new Error(
      `structuredContent does not validate against the registered outputSchema ` +
        `(the MCP client would reject this with -32602): ${result.errorMessage}`,
    );
  }
}
