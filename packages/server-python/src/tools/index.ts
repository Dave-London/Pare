import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPipInstallTool } from "./pip-install.js";
import { registerMypyTool } from "./mypy.js";
import { registerRuffTool } from "./ruff.js";
import { registerPipAuditTool } from "./pip-audit.js";
import { registerPytestTool } from "./pytest.js";
import { registerUvInstallTool } from "./uv-install.js";
import { registerUvRunTool } from "./uv-run.js";
import { registerBlackTool } from "./black.js";

export function registerAllTools(server: McpServer) {
  registerPipInstallTool(server);
  registerMypyTool(server);
  registerRuffTool(server);
  registerPipAuditTool(server);
  registerPytestTool(server);
  registerUvInstallTool(server);
  registerUvRunTool(server);
  registerBlackTool(server);
}
