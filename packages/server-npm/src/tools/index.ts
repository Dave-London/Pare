import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerInstallTool } from "./install.js";
import { registerAuditTool } from "./audit.js";
import { registerOutdatedTool } from "./outdated.js";
import { registerListTool } from "./list.js";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerInitTool } from "./init.js";
import { registerInfoTool } from "./info.js";
import { registerSearchTool } from "./search.js";
import { registerNvmTool } from "./nvm.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("npm", name);
  if (s("install")) registerInstallTool(server);
  if (s("audit")) registerAuditTool(server);
  if (s("outdated")) registerOutdatedTool(server);
  if (s("list")) registerListTool(server);
  if (s("run")) registerRunTool(server);
  if (s("test")) registerTestTool(server);
  if (s("init")) registerInitTool(server);
  if (s("info")) registerInfoTool(server);
  if (s("search")) registerSearchTool(server);
  if (s("nvm")) registerNvmTool(server);
}
