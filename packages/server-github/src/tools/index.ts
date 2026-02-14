import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerPrViewTool } from "./pr-view.js";
import { registerPrListTool } from "./pr-list.js";
import { registerPrCreateTool } from "./pr-create.js";
import { registerPrMergeTool } from "./pr-merge.js";
import { registerPrCommentTool } from "./pr-comment.js";
import { registerPrReviewTool } from "./pr-review.js";
import { registerIssueViewTool } from "./issue-view.js";
import { registerIssueListTool } from "./issue-list.js";
import { registerIssueCreateTool } from "./issue-create.js";
import { registerIssueCloseTool } from "./issue-close.js";
import { registerIssueCommentTool } from "./issue-comment.js";
import { registerRunViewTool } from "./run-view.js";
import { registerRunListTool } from "./run-list.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("github", name);
  if (s("pr-view")) registerPrViewTool(server);
  if (s("pr-list")) registerPrListTool(server);
  if (s("pr-create")) registerPrCreateTool(server);
  if (s("pr-merge")) registerPrMergeTool(server);
  if (s("pr-comment")) registerPrCommentTool(server);
  if (s("pr-review")) registerPrReviewTool(server);
  if (s("issue-view")) registerIssueViewTool(server);
  if (s("issue-list")) registerIssueListTool(server);
  if (s("issue-create")) registerIssueCreateTool(server);
  if (s("issue-close")) registerIssueCloseTool(server);
  if (s("issue-comment")) registerIssueCommentTool(server);
  if (s("run-view")) registerRunViewTool(server);
  if (s("run-list")) registerRunListTool(server);
}
