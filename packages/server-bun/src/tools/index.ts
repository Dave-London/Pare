import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerBuildTool } from "./build.js";
import { registerInstallTool } from "./install.js";
import { registerAddTool } from "./add.js";
import { registerRemoveTool } from "./remove.js";
import { registerOutdatedTool } from "./outdated.js";
import { registerPmLsTool } from "./pm-ls.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Runs a script or file with `bun run` and returns structured output (stdout, stderr, exit code, duration).",
    register: registerRunTool,
  },
  {
    name: "test",
    description: "Runs `bun test` and returns structured pass/fail results with per-test details.",
    register: registerTestTool,
  },
  {
    name: "build",
    description:
      "Runs `bun build` to bundle JavaScript/TypeScript and returns structured output with artifact info.",
    register: registerBuildTool,
  },
  {
    name: "install",
    description:
      "Runs `bun install` to install project dependencies and returns structured output with package count.",
    register: registerInstallTool,
  },
  {
    name: "add",
    description: "Runs `bun add` to add one or more packages and returns structured output.",
    register: registerAddTool,
  },
  {
    name: "remove",
    description: "Runs `bun remove` to remove one or more packages and returns structured output.",
    register: registerRemoveTool,
  },
  {
    name: "outdated",
    description:
      "Runs `bun outdated` to check for outdated packages and returns structured version info.",
    register: registerOutdatedTool,
  },
  {
    name: "pm-ls",
    description: "Runs `bun pm ls` to list installed packages and returns structured package info.",
    register: registerPmLsTool,
  },
];

/** Registers all Bun tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("bun", name);
  const isCore = (name: string) => isCoreToolForServer("bun", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "bun");
  }
}
