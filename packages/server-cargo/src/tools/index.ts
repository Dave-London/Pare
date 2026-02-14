import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerClippyTool } from "./clippy.js";
import { registerRunTool } from "./run.js";
import { registerAddTool } from "./add.js";
import { registerRemoveTool } from "./remove.js";
import { registerFmtTool } from "./fmt.js";
import { registerDocTool } from "./doc.js";
import { registerCheckTool } from "./check.js";
import { registerUpdateTool } from "./update.js";
import { registerTreeTool } from "./tree.js";
import { registerAuditTool } from "./audit.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("cargo", name);
  if (s("build")) registerBuildTool(server);
  if (s("test")) registerTestTool(server);
  if (s("clippy")) registerClippyTool(server);
  if (s("run")) registerRunTool(server);
  if (s("add")) registerAddTool(server);
  if (s("remove")) registerRemoveTool(server);
  if (s("fmt")) registerFmtTool(server);
  if (s("doc")) registerDocTool(server);
  if (s("check")) registerCheckTool(server);
  if (s("update")) registerUpdateTool(server);
  if (s("tree")) registerTreeTool(server);
  if (s("audit")) registerAuditTool(server);
}
