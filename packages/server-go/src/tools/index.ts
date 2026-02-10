import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerVetTool } from "./vet.js";

export function registerAllTools(server: McpServer) {
  registerBuildTool(server);
  registerTestTool(server);
  registerVetTool(server);
}
