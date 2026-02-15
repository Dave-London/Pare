import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRequestTool } from "./request.js";
import { registerGetTool } from "./get.js";
import { registerPostTool } from "./post.js";
import { registerHeadTool } from "./head.js";

/** Registers all HTTP tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("http", name);
  if (s("request")) registerRequestTool(server);
  if (s("get")) registerGetTool(server);
  if (s("post")) registerPostTool(server);
  if (s("head")) registerHeadTool(server);
}
