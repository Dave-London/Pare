import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLintTool } from "./lint.js";
import { registerFormatCheckTool } from "./format-check.js";

export function registerAllTools(server: McpServer) {
  registerLintTool(server);
  registerFormatCheckTool(server);
}
