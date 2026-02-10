/**
 * The return type for every pare tool — dual output with both
 * human-readable content and machine-parseable structuredContent.
 *
 * The index signature satisfies the MCP SDK's CallToolResult type.
 */
export type ToolOutput<T = unknown> = {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
};
