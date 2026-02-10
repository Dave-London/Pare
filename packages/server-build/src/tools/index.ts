import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTscTool } from "./tsc.js";
import { registerBuildTool } from "./build.js";

export function registerAllTools(server: McpServer) {
  registerTscTool(server);
  registerBuildTool(server);
}
