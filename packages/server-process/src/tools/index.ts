import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("process", name);
  if (s("run")) registerRunTool(server);
}
