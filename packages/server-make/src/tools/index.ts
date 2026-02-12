import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerListTool } from "./list.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("make", name);
  if (s("run")) registerRunTool(server);
  if (s("list")) registerListTool(server);
}
