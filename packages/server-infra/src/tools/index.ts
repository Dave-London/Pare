import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerInitTool } from "./init.js";
import { registerPlanTool } from "./plan.js";
import { registerValidateTool } from "./validate.js";
import { registerFmtTool } from "./fmt.js";
import { registerOutputTool } from "./output.js";
import { registerStateListTool } from "./state-list.js";
import { registerWorkspaceTool } from "./workspace.js";
import { registerShowTool } from "./show.js";
import { registerVagrantTool } from "./vagrant.js";

/** Registers all Infra tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("infra", name);
  if (s("init")) registerInitTool(server);
  if (s("plan")) registerPlanTool(server);
  if (s("validate")) registerValidateTool(server);
  if (s("fmt")) registerFmtTool(server);
  if (s("output")) registerOutputTool(server);
  if (s("state-list")) registerStateListTool(server);
  if (s("workspace")) registerWorkspaceTool(server);
  if (s("show")) registerShowTool(server);
  if (s("vagrant")) registerVagrantTool(server);
}
