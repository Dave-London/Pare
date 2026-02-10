import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStatusTool } from "./status.js";
import { registerLogTool } from "./log.js";
import { registerDiffTool } from "./diff.js";
import { registerBranchTool } from "./branch.js";
import { registerShowTool } from "./show.js";
import { registerAddTool } from "./add.js";
import { registerCommitTool } from "./commit.js";
import { registerPushTool } from "./push.js";
import { registerPullTool } from "./pull.js";
import { registerCheckoutTool } from "./checkout.js";

export function registerAllTools(server: McpServer) {
  registerStatusTool(server);
  registerLogTool(server);
  registerDiffTool(server);
  registerBranchTool(server);
  registerShowTool(server);
  registerAddTool(server);
  registerCommitTool(server);
  registerPushTool(server);
  registerPullTool(server);
  registerCheckoutTool(server);
}
