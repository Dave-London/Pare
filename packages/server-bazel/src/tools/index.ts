import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerBazelTool } from "./bazel.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("bazel", name);
  if (s("bazel")) registerBazelTool(server);
}
