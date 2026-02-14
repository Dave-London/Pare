import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerGetTool } from "./get.js";
import { registerDescribeTool } from "./describe.js";
import { registerLogsTool } from "./logs.js";
import { registerApplyTool } from "./apply.js";
import { registerHelmTool } from "./helm.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("k8s", name);
  if (s("get")) registerGetTool(server);
  if (s("describe")) registerDescribeTool(server);
  if (s("logs")) registerLogsTool(server);
  if (s("apply")) registerApplyTool(server);
  if (s("helm")) registerHelmTool(server);
}
