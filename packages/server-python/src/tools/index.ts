import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerPipInstallTool } from "./pip-install.js";
import { registerPipListTool } from "./pip-list.js";
import { registerPipShowTool } from "./pip-show.js";
import { registerMypyTool } from "./mypy.js";
import { registerRuffTool } from "./ruff.js";
import { registerRuffFormatTool } from "./ruff-format.js";
import { registerPipAuditTool } from "./pip-audit.js";
import { registerPytestTool } from "./pytest.js";
import { registerUvInstallTool } from "./uv-install.js";
import { registerUvRunTool } from "./uv-run.js";
import { registerBlackTool } from "./black.js";
import { registerCondaTool } from "./conda.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("python", name);
  if (s("pip-install")) registerPipInstallTool(server);
  if (s("pip-list")) registerPipListTool(server);
  if (s("pip-show")) registerPipShowTool(server);
  if (s("mypy")) registerMypyTool(server);
  if (s("ruff-check")) registerRuffTool(server);
  if (s("ruff-format")) registerRuffFormatTool(server);
  if (s("pip-audit")) registerPipAuditTool(server);
  if (s("pytest")) registerPytestTool(server);
  if (s("uv-install")) registerUvInstallTool(server);
  if (s("uv-run")) registerUvRunTool(server);
  if (s("black")) registerBlackTool(server);
  if (s("conda")) registerCondaTool(server);
}
