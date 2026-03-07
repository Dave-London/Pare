import type { ZodType } from "zod";
import type { ToolOutput } from "./types.js";

/**
 * Returns true when dev-mode validation should run.
 * Active when NODE_ENV is NOT 'production' or PARE_DEBUG is set.
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV !== "production" || !!process.env.PARE_DEBUG;
}

/**
 * Validates `data` against a Zod `outputSchema` in dev mode.
 * Throws a descriptive error when the data does not match the schema,
 * helping developers catch compact-map / schema mismatches early.
 *
 * No-ops in production (NODE_ENV=production without PARE_DEBUG).
 */
function devValidate<T>(data: T, outputSchema: ZodType | undefined, label: string): void {
  if (!outputSchema || !isDevMode()) return;
  const result = outputSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `compactDualOutput (${label}): structured output does not match outputSchema.\n` +
        `Validation errors:\n${issues}`,
    );
  }
}

/**
 * Creates the dual-output response that every pare tool returns.
 *
 * - `content`: Human-readable text for MCP clients that don't support structuredContent.
 * - `structuredContent`: Typed, schema-validated JSON for agents.
 *
 * @param data - The structured data to return.
 * @param humanFormat - A function that formats `data` as human-readable text.
 */
export function dualOutput<T>(data: T, humanFormat: (d: T) => string): ToolOutput<T> {
  return {
    content: [{ type: "text", text: humanFormat(data) }],
    structuredContent: data,
  };
}

/**
 * Estimates the token count of a string using the ~4 chars/token heuristic.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Creates a dual-output response with automatic compact mode.
 *
 * Compares the token cost of the full structured JSON against the raw CLI stdout.
 * When the structured output would use more tokens than raw, applies a compact
 * projection to reduce the schema. Setting `forceFullSchema` to true always
 * returns the full (non-compact) data.
 *
 * @param data - The full structured data parsed from CLI output.
 * @param rawStdout - The ANSI-stripped stdout from the CLI command.
 * @param humanFormat - Formatter for full data (used when not compacting).
 * @param compactMap - Projects full data into a compact shape.
 * @param compactFormat - Formatter for compact data.
 * @param forceFullSchema - When true, skip auto-detection and return full data.
 * @param outputSchema - Optional Zod schema. In dev mode (NODE_ENV !== 'production' or PARE_DEBUG set),
 *   the structured output is validated against this schema before returning. Mismatches throw a
 *   descriptive error, catching compact-map bugs during development/testing rather than in production.
 */
export function compactDualOutput<T, C>(
  data: T,
  rawStdout: string,
  humanFormat: (d: T) => string,
  compactMap: (d: T) => C,
  compactFormat: (d: C) => string,
  forceFullSchema: boolean,
  outputSchema?: ZodType,
): ToolOutput<T | C> {
  if (forceFullSchema) {
    const out = dualOutput(data, humanFormat) as ToolOutput<T | C>;
    devValidate(out.structuredContent, outputSchema, "full");
    return out;
  }

  const structuredTokens = estimateTokens(JSON.stringify(data));
  const rawTokens = estimateTokens(rawStdout);

  if (structuredTokens >= rawTokens) {
    const compact = compactMap(data);
    const out = dualOutput(compact, compactFormat) as ToolOutput<T | C>;
    devValidate(out.structuredContent, outputSchema, "compact");
    return out;
  }

  const out = dualOutput(data, humanFormat) as ToolOutput<T | C>;
  devValidate(out.structuredContent, outputSchema, "full");
  return out;
}

/**
 * Creates a dual-output response where the formatter receives the full internal
 * data (with extra fields for human-readable output) while structuredContent
 * receives a clean projection that matches the output schema.
 *
 * Use this instead of `dualOutput` when your parsed data has Internal-only fields
 * that should appear in human text but NOT in structuredContent.
 *
 * @param data - The full internal data (may contain extra fields for formatters).
 * @param humanFormat - Formatter that receives the full internal data.
 * @param schemaMap - Projects internal data into the clean schema shape for structuredContent.
 */
export function strippedDualOutput<T, S>(
  data: T,
  humanFormat: (d: T) => string,
  schemaMap: (d: T) => S,
): ToolOutput<S> {
  return {
    content: [{ type: "text", text: humanFormat(data) }],
    structuredContent: schemaMap(data),
  };
}

/**
 * Like `compactDualOutput` but strips Internal-only fields from the full data path
 * using a schema projection function. This ensures structuredContent only contains
 * fields defined in the output schema, while formatters still receive all fields.
 *
 * @param data - The full internal data parsed from CLI output.
 * @param rawStdout - The ANSI-stripped stdout from the CLI command.
 * @param humanFormat - Formatter for full data (used when not compacting).
 * @param schemaMap - Projects internal data into clean schema shape (for non-compact mode).
 * @param compactMap - Projects full data into a compact shape (for compact mode).
 * @param compactFormat - Formatter for compact data.
 * @param forceFullSchema - When true, skip auto-detection and return full data.
 * @param outputSchema - Optional Zod schema for dev-mode validation (see compactDualOutput).
 */
export function strippedCompactDualOutput<T, S, C>(
  data: T,
  rawStdout: string,
  humanFormat: (d: T) => string,
  schemaMap: (d: T) => S,
  compactMap: (d: T) => C,
  compactFormat: (d: C) => string,
  forceFullSchema: boolean,
  outputSchema?: ZodType,
): ToolOutput<S | C> {
  if (forceFullSchema) {
    const out = strippedDualOutput(data, humanFormat, schemaMap) as ToolOutput<S | C>;
    devValidate(out.structuredContent, outputSchema, "full");
    return out;
  }

  const structuredTokens = estimateTokens(JSON.stringify(data));
  const rawTokens = estimateTokens(rawStdout);

  if (structuredTokens >= rawTokens) {
    const compact = compactMap(data);
    const out = dualOutput(compact, compactFormat) as ToolOutput<S | C>;
    devValidate(out.structuredContent, outputSchema, "compact");
    return out;
  }

  const out = strippedDualOutput(data, humanFormat, schemaMap) as ToolOutput<S | C>;
  devValidate(out.structuredContent, outputSchema, "full");
  return out;
}
