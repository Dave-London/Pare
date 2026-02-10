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
