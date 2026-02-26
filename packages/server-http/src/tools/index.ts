import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRequestTool } from "./request.js";
import { registerGetTool } from "./get.js";
import { registerPostTool } from "./post.js";
import { registerHeadTool } from "./head.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "request",
    description:
      "Makes an HTTP request via curl and returns structured response data (status, headers, body, timing).",
    register: registerRequestTool,
  },
  {
    name: "get",
    description: "Makes an HTTP GET request via curl and returns structured response data.",
    register: registerGetTool,
  },
  {
    name: "post",
    description: "Makes an HTTP POST request via curl and returns structured response data.",
    register: registerPostTool,
  },
  {
    name: "head",
    description:
      "Makes an HTTP HEAD request via curl and returns structured response headers (no body).",
    register: registerHeadTool,
  },
];

/** Registers all Http tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("http", name);
  const isCore = (name: string) => isCoreToolForServer("http", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "http");
  }
}
