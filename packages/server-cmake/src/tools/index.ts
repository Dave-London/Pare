import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerCMakeTool } from "./cmake.js";

/** Registers all CMake tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("cmake", name);
  if (s("cmake")) registerCMakeTool(server);
}
