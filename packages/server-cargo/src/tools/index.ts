import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerClippyTool } from "./clippy.js";
import { registerRunTool } from "./run.js";
import { registerAddTool } from "./add.js";
import { registerRemoveTool } from "./remove.js";
import { registerFmtTool } from "./fmt.js";
import { registerDocTool } from "./doc.js";
import { registerCheckTool } from "./check.js";

export function registerAllTools(server: McpServer) {
  registerBuildTool(server);
  registerTestTool(server);
  registerClippyTool(server);
  registerRunTool(server);
  registerAddTool(server);
  registerRemoveTool(server);
  registerFmtTool(server);
  registerDocTool(server);
  registerCheckTool(server);
}
