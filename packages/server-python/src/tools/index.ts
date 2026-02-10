import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPipInstallTool } from "./pip-install.js";
import { registerMypyTool } from "./mypy.js";
import { registerRuffTool } from "./ruff.js";
import { registerPipAuditTool } from "./pip-audit.js";

export function registerAllTools(server: McpServer) {
  registerPipInstallTool(server);
  registerMypyTool(server);
  registerRuffTool(server);
  registerPipAuditTool(server);
}
