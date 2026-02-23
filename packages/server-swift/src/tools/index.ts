import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerRunTool } from "./run.js";
import { registerPackageResolveTool } from "./package-resolve.js";
import { registerPackageUpdateTool } from "./package-update.js";
import { registerPackageShowDependenciesTool } from "./package-show-dependencies.js";
import { registerPackageCleanTool } from "./package-clean.js";
import { registerPackageInitTool } from "./package-init.js";

/** Registers all Swift tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("swift", name);
  if (s("build")) registerBuildTool(server);
  if (s("test")) registerTestTool(server);
  if (s("run")) registerRunTool(server);
  if (s("package-resolve")) registerPackageResolveTool(server);
  if (s("package-update")) registerPackageUpdateTool(server);
  if (s("package-show-dependencies")) registerPackageShowDependenciesTool(server);
  if (s("package-clean")) registerPackageCleanTool(server);
  if (s("package-init")) registerPackageInitTool(server);
}
