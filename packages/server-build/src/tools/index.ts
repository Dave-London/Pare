import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerTscTool } from "./tsc.js";
import { registerBuildTool } from "./build.js";
import { registerEsbuildTool } from "./esbuild.js";
import { registerViteBuildTool } from "./vite-build.js";
import { registerWebpackTool } from "./webpack.js";
import { registerTurboTool } from "./turbo.js";
import { registerNxTool } from "./nx.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("build", name);
  if (s("tsc")) registerTscTool(server);
  if (s("build")) registerBuildTool(server);
  if (s("esbuild")) registerEsbuildTool(server);
  if (s("vite-build")) registerViteBuildTool(server);
  if (s("webpack")) registerWebpackTool(server);
  if (s("turbo")) registerTurboTool(server);
  if (s("nx")) registerNxTool(server);
}
