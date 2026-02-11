import type { ToolOutput } from "./types.js";

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
 */
export function compactDualOutput<T, C>(
  data: T,
  rawStdout: string,
  humanFormat: (d: T) => string,
  compactMap: (d: T) => C,
  compactFormat: (d: C) => string,
  forceFullSchema: boolean,
): ToolOutput<T | C> {
  if (forceFullSchema) {
    return dualOutput(data, humanFormat) as ToolOutput<T | C>;
  }

  const structuredTokens = estimateTokens(JSON.stringify(data));
  const rawTokens = estimateTokens(rawStdout);

  if (structuredTokens >= rawTokens) {
    const compact = compactMap(data);
    return dualOutput(compact, compactFormat) as ToolOutput<T | C>;
  }

  return dualOutput(data, humanFormat) as ToolOutput<T | C>;
}
