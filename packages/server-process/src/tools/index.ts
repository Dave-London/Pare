import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerReloadTool } from "./reload.js";

/** Registers all process tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("process", name);
  if (s("run")) registerRunTool(server);
  if (s("reload")) registerReloadTool(server);
}
