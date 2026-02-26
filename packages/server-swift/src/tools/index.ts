import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerRunTool } from "./run.js";
import { registerPackageResolveTool } from "./package-resolve.js";
import { registerPackageUpdateTool } from "./package-update.js";
import { registerPackageShowDependenciesTool } from "./package-show-dependencies.js";
import { registerPackageCleanTool } from "./package-clean.js";
import { registerPackageInitTool } from "./package-init.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "build",
    description: "Builds a Swift package and returns structured compiler diagnostics.",
    register: registerBuildTool,
  },
  {
    name: "test",
    description:
      "Runs swift test and returns structured test results (name, status, pass/fail counts).",
    register: registerTestTool,
  },
  {
    name: "run",
    description:
      "Runs a Swift executable and returns structured output (exit code, stdout, stderr).",
    register: registerRunTool,
  },
  {
    name: "package-resolve",
    description: "Resolves Swift package dependencies and returns structured resolution results.",
    register: registerPackageResolveTool,
  },
  {
    name: "package-update",
    description: "Updates Swift package dependencies and returns structured update results.",
    register: registerPackageUpdateTool,
  },
  {
    name: "package-show-dependencies",
    description:
      "Shows the dependency tree of a Swift package and returns structured dependency data.",
    register: registerPackageShowDependenciesTool,
  },
  {
    name: "package-clean",
    description: "Cleans Swift package build artifacts and returns structured result.",
    register: registerPackageCleanTool,
  },
  {
    name: "package-init",
    description:
      "Initializes a new Swift package and returns structured result with created files.",
    register: registerPackageInitTool,
  },
];

/** Registers all Swift tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("swift", name);
  const isCore = (name: string) => isCoreToolForServer("swift", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "swift");
  }
}
