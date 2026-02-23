import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerRunTool } from "./run.js";
import { registerDevelopTool } from "./develop.js";
import { registerShellTool } from "./shell.js";
import { registerFlakeShowTool } from "./flake-show.js";
import { registerFlakeCheckTool } from "./flake-check.js";
import { registerFlakeUpdateTool } from "./flake-update.js";

/** Registers all Nix tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("nix", name);
  if (s("build")) registerBuildTool(server);
  if (s("run")) registerRunTool(server);
  if (s("develop")) registerDevelopTool(server);
  if (s("shell")) registerShellTool(server);
  if (s("flake-show")) registerFlakeShowTool(server);
  if (s("flake-check")) registerFlakeCheckTool(server);
  if (s("flake-update")) registerFlakeUpdateTool(server);
}
