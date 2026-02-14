import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerTrivyTool } from "./trivy.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("security", name);
  if (s("trivy")) registerTrivyTool(server);
}
