import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerSearchTool } from "./search.js";
import { registerFindTool } from "./find.js";
import { registerCountTool } from "./count.js";
import { registerJqTool } from "./jq.js";
import { registerYqTool } from "./yq.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "search",
    description:
      "Searches file contents using ripgrep with structured JSON output. Returns match locations with file, line, column, matched text, and line content.",
    register: registerSearchTool,
  },
  {
    name: "find",
    description:
      "Finds files and directories using fd with structured output. Returns file paths, names, and extensions.",
    register: registerFindTool,
  },
  {
    name: "count",
    description:
      "Counts pattern matches per file using ripgrep. Returns per-file match counts and totals.",
    register: registerCountTool,
  },
  {
    name: "jq",
    description:
      "Processes and transforms JSON using jq expressions. Accepts JSON from a file path or inline string.",
    register: registerJqTool,
  },
  {
    name: "yq",
    description:
      "Processes and transforms YAML, JSON, XML, TOML, and properties files using yq expressions.",
    register: registerYqTool,
  },
];

/** Registers all Search tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("search", name);
  const isCore = (name: string) => isCoreToolForServer("search", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "search");
  }
}
