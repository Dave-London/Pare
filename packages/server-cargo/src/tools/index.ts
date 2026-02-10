import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerClippyTool } from "./clippy.js";

export function registerAllTools(server: McpServer) {
  registerBuildTool(server);
  registerTestTool(server);
  registerClippyTool(server);
}
