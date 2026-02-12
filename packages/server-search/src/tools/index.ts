import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerSearchTool } from "./search.js";
import { registerFindTool } from "./find.js";
import { registerCountTool } from "./count.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("search", name);
  if (s("search")) registerSearchTool(server);
  if (s("find")) registerFindTool(server);
  if (s("count")) registerCountTool(server);
}
