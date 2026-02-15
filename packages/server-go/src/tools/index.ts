import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerVetTool } from "./vet.js";
import { registerRunTool } from "./run.js";
import { registerModTidyTool } from "./mod-tidy.js";
import { registerFmtTool } from "./fmt.js";
import { registerGenerateTool } from "./generate.js";
import { registerEnvTool } from "./env.js";
import { registerListTool } from "./list.js";
import { registerGetTool } from "./get.js";
import { registerGolangciLintTool } from "./golangci-lint.js";

/** Registers all Go tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("go", name);
  if (s("build")) registerBuildTool(server);
  if (s("test")) registerTestTool(server);
  if (s("vet")) registerVetTool(server);
  if (s("run")) registerRunTool(server);
  if (s("mod-tidy")) registerModTidyTool(server);
  if (s("fmt")) registerFmtTool(server);
  if (s("generate")) registerGenerateTool(server);
  if (s("env")) registerEnvTool(server);
  if (s("list")) registerListTool(server);
  if (s("get")) registerGetTool(server);
  if (s("golangci-lint")) registerGolangciLintTool(server);
}
