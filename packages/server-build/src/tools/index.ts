import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTscTool } from "./tsc.js";
import { registerBuildTool } from "./build.js";
import { registerEsbuildTool } from "./esbuild.js";
import { registerViteBuildTool } from "./vite-build.js";
import { registerWebpackTool } from "./webpack.js";

export function registerAllTools(server: McpServer) {
  registerTscTool(server);
  registerBuildTool(server);
  registerEsbuildTool(server);
  registerViteBuildTool(server);
  registerWebpackTool(server);
}
