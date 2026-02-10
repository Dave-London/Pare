import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInstallTool } from "./install.js";
import { registerAuditTool } from "./audit.js";
import { registerOutdatedTool } from "./outdated.js";
import { registerListTool } from "./list.js";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerInitTool } from "./init.js";

export function registerAllTools(server: McpServer) {
  registerInstallTool(server);
  registerAuditTool(server);
  registerOutdatedTool(server);
  registerListTool(server);
  registerRunTool(server);
  registerTestTool(server);
  registerInitTool(server);
}
