import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerListTool } from "./list.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Runs a make or just target and returns structured output (stdout, stderr, exit code, duration).",
    register: registerRunTool,
  },
  {
    name: "list",
    description:
      "Lists available make or just targets with optional descriptions. Auto-detects make vs just.",
    register: registerListTool,
  },
];

/** Registers all Make tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("make", name);
  const isCore = (name: string) => isCoreToolForServer("make", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "make");
  }
}
