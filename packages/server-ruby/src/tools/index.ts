import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerCheckTool } from "./check.js";
import { registerGemListTool } from "./gem-list.js";
import { registerGemInstallTool } from "./gem-install.js";
import { registerGemOutdatedTool } from "./gem-outdated.js";
import { registerBundleInstallTool } from "./bundle-install.js";
import { registerBundleExecTool } from "./bundle-exec.js";
import { registerBundleCheckTool } from "./bundle-check.js";

/** Registers all Ruby tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("ruby", name);
  if (s("run")) registerRunTool(server);
  if (s("check")) registerCheckTool(server);
  if (s("gem-list")) registerGemListTool(server);
  if (s("gem-install")) registerGemInstallTool(server);
  if (s("gem-outdated")) registerGemOutdatedTool(server);
  if (s("bundle-install")) registerBundleInstallTool(server);
  if (s("bundle-exec")) registerBundleExecTool(server);
  if (s("bundle-check")) registerBundleCheckTool(server);
}
