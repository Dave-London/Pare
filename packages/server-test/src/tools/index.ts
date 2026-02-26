import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerCoverageTool } from "./coverage.js";
import { registerPlaywrightTool } from "./playwright.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Auto-detects test framework (pytest/jest/vitest/mocha), runs tests, returns structured results with failures.",
    register: registerRunTool,
  },
  {
    name: "coverage",
    description: "Runs tests with coverage and returns structured coverage summary per file.",
    register: registerCoverageTool,
  },
  {
    name: "playwright",
    description:
      "Runs Playwright tests with JSON reporter and returns structured results with pass/fail status, duration, and error messages.",
    register: registerPlaywrightTool,
  },
];

/** Registers all Test tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("test", name);
  const isCore = (name: string) => isCoreToolForServer("test", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "test");
  }
}
