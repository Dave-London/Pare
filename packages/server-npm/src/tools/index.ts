import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerInstallTool } from "./install.js";
import { registerAuditTool } from "./audit.js";
import { registerOutdatedTool } from "./outdated.js";
import { registerListTool } from "./list.js";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerInitTool } from "./init.js";
import { registerInfoTool } from "./info.js";
import { registerSearchTool } from "./search.js";
import { registerNvmTool } from "./nvm.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "install",
    description:
      "Runs npm/pnpm/yarn install and returns a structured summary of added/removed packages and vulnerabilities.",
    register: registerInstallTool,
  },
  {
    name: "audit",
    description: "Runs npm/pnpm/yarn audit and returns structured vulnerability data.",
    register: registerAuditTool,
  },
  {
    name: "outdated",
    description: "Checks for outdated packages and returns structured update information.",
    register: registerOutdatedTool,
  },
  {
    name: "list",
    description: "Lists installed packages as structured dependency data.",
    register: registerListTool,
  },
  {
    name: "run",
    description:
      "Runs a package.json script and returns structured output with exit code, stdout, stderr, and duration.",
    register: registerRunTool,
  },
  {
    name: "test",
    description:
      "Runs npm/pnpm/yarn test and returns structured output with exit code, stdout, stderr, and duration.",
    register: registerTestTool,
  },
  {
    name: "init",
    description: "Initializes a new package.json in the target directory.",
    register: registerInitTool,
  },
  {
    name: "info",
    description: "Shows detailed package metadata from the npm registry.",
    register: registerInfoTool,
  },
  {
    name: "search",
    description: "Searches the npm registry for packages matching a query.",
    register: registerSearchTool,
  },
  {
    name: "nvm",
    description: "Manages Node.js versions via nvm.",
    register: registerNvmTool,
  },
];

/** Registers all npm tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("npm", name);
  const isCore = (name: string) => isCoreToolForServer("npm", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "npm");
  }
}
