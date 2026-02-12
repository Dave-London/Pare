import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
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
  const s = (name: string) => shouldRegisterTool("git", name);
  if (s("status")) registerStatusTool(server);
  if (s("log")) registerLogTool(server);
  if (s("diff")) registerDiffTool(server);
  if (s("branch")) registerBranchTool(server);
  if (s("show")) registerShowTool(server);
  if (s("add")) registerAddTool(server);
  if (s("commit")) registerCommitTool(server);
  if (s("push")) registerPushTool(server);
  if (s("pull")) registerPullTool(server);
  if (s("checkout")) registerCheckoutTool(server);
}
