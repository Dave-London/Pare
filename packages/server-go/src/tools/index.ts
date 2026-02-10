import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerVetTool } from "./vet.js";
import { registerRunTool } from "./run.js";
import { registerModTidyTool } from "./mod-tidy.js";
import { registerFmtTool } from "./fmt.js";
import { registerGenerateTool } from "./generate.js";

export function registerAllTools(server: McpServer) {
  registerBuildTool(server);
  registerTestTool(server);
  registerVetTool(server);
  registerRunTool(server);
  registerModTidyTool(server);
  registerFmtTool(server);
  registerGenerateTool(server);
}
