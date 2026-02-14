import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerCoverageTool } from "./coverage.js";
import { registerPlaywrightTool } from "./playwright.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("test", name);
  if (s("run")) registerRunTool(server);
  if (s("coverage")) registerCoverageTool(server);
  if (s("playwright")) registerPlaywrightTool(server);
}
