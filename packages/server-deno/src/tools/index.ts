import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerFmtTool } from "./fmt.js";
import { registerLintTool } from "./lint.js";
import { registerCheckTool } from "./check.js";
import { registerTaskTool } from "./task.js";
import { registerInfoTool } from "./info.js";

/** Registers all Deno tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("deno", name);
  if (s("run")) registerRunTool(server);
  if (s("test")) registerTestTool(server);
  if (s("fmt")) registerFmtTool(server);
  if (s("lint")) registerLintTool(server);
  if (s("check")) registerCheckTool(server);
  if (s("task")) registerTaskTool(server);
  if (s("info")) registerInfoTool(server);
}
