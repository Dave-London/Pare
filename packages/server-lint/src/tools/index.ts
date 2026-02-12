import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerLintTool } from "./lint.js";
import { registerFormatCheckTool } from "./format-check.js";
import { registerPrettierFormatTool } from "./prettier-format.js";
import { registerBiomeCheckTool } from "./biome-check.js";
import { registerBiomeFormatTool } from "./biome-format.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("lint", name);
  if (s("lint")) registerLintTool(server);
  if (s("format-check")) registerFormatCheckTool(server);
  if (s("prettier-format")) registerPrettierFormatTool(server);
  if (s("biome-check")) registerBiomeCheckTool(server);
  if (s("biome-format")) registerBiomeFormatTool(server);
}
