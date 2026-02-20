import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerBuildTool } from "./build.js";
import { registerInstallTool } from "./install.js";
import { registerAddTool } from "./add.js";
import { registerRemoveTool } from "./remove.js";
import { registerOutdatedTool } from "./outdated.js";
import { registerPmLsTool } from "./pm-ls.js";

/** Registers all Bun tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("bun", name);
  if (s("run")) registerRunTool(server);
  if (s("test")) registerTestTool(server);
  if (s("build")) registerBuildTool(server);
  if (s("install")) registerInstallTool(server);
  if (s("add")) registerAddTool(server);
  if (s("remove")) registerRemoveTool(server);
  if (s("outdated")) registerOutdatedTool(server);
  if (s("pm-ls")) registerPmLsTool(server);
}
