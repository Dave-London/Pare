import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStatusTool } from "./status.js";
import { registerLogTool } from "./log.js";
import { registerDiffTool } from "./diff.js";
import { registerBranchTool } from "./branch.js";
import { registerShowTool } from "./show.js";

export function registerAllTools(server: McpServer) {
  registerStatusTool(server);
  registerLogTool(server);
  registerDiffTool(server);
  registerBranchTool(server);
  registerShowTool(server);
}
