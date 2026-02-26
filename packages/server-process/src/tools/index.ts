import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerReloadTool } from "./reload.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Runs a command and returns structured output (stdout, stderr, exit code, duration, timeout status).",
    register: registerRunTool,
  },
  {
    name: "reload",
    description:
      "Rebuilds MCP server and sends tool list changed notification to refresh tool definitions.",
    register: registerReloadTool,
  },
];

/** Registers all Process tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("process", name);
  const isCore = (name: string) => isCoreToolForServer("process", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "process");
  }
}
