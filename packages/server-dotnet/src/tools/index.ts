import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerRunTool } from "./run.js";
import { registerPublishTool } from "./publish.js";
import { registerRestoreTool } from "./restore.js";
import { registerCleanTool } from "./clean.js";
import { registerAddPackageTool } from "./add-package.js";
import { registerListPackageTool } from "./list-package.js";

/** Registers all .NET tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("dotnet", name);
  if (s("build")) registerBuildTool(server);
  if (s("test")) registerTestTool(server);
  if (s("run")) registerRunTool(server);
  if (s("publish")) registerPublishTool(server);
  if (s("restore")) registerRestoreTool(server);
  if (s("clean")) registerCleanTool(server);
  if (s("add-package")) registerAddPackageTool(server);
  if (s("list-package")) registerListPackageTool(server);
}
