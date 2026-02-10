import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLintTool } from "./lint.js";
import { registerFormatCheckTool } from "./format-check.js";
import { registerPrettierFormatTool } from "./prettier-format.js";
import { registerBiomeCheckTool } from "./biome-check.js";
import { registerBiomeFormatTool } from "./biome-format.js";

export function registerAllTools(server: McpServer) {
  registerLintTool(server);
  registerFormatCheckTool(server);
  registerPrettierFormatTool(server);
  registerBiomeCheckTool(server);
  registerBiomeFormatTool(server);
}
