import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPsTool } from "./ps.js";
import { registerBuildTool } from "./build.js";
import { registerLogsTool } from "./logs.js";
import { registerImagesTool } from "./images.js";

export function registerAllTools(server: McpServer) {
  registerPsTool(server);
  registerBuildTool(server);
  registerLogsTool(server);
  registerImagesTool(server);
}
