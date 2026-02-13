import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerPrViewTool } from "./pr-view.js";
import { registerPrListTool } from "./pr-list.js";
import { registerPrCreateTool } from "./pr-create.js";
import { registerPrMergeTool } from "./pr-merge.js";
import { registerIssueViewTool } from "./issue-view.js";
import { registerIssueListTool } from "./issue-list.js";
import { registerIssueCreateTool } from "./issue-create.js";
import { registerRunViewTool } from "./run-view.js";
import { registerRunListTool } from "./run-list.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("github", name);
  if (s("pr-view")) registerPrViewTool(server);
  if (s("pr-list")) registerPrListTool(server);
  if (s("pr-create")) registerPrCreateTool(server);
  if (s("pr-merge")) registerPrMergeTool(server);
  if (s("issue-view")) registerIssueViewTool(server);
  if (s("issue-list")) registerIssueListTool(server);
  if (s("issue-create")) registerIssueCreateTool(server);
  if (s("run-view")) registerRunViewTool(server);
  if (s("run-list")) registerRunListTool(server);
}
