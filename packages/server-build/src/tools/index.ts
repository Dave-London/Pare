import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerTscTool } from "./tsc.js";
import { registerBuildTool } from "./build.js";
import { registerEsbuildTool } from "./esbuild.js";
import { registerViteBuildTool } from "./vite-build.js";
import { registerWebpackTool } from "./webpack.js";
import { registerTurboTool } from "./turbo.js";
import { registerNxTool } from "./nx.js";
import { registerLernaTool } from "./lerna.js";
import { registerRollupTool } from "./rollup.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "tsc",
    description:
      "Runs the TypeScript compiler and returns structured diagnostics (file, line, column, code, message).",
    register: registerTscTool,
  },
  {
    name: "build",
    description:
      "Runs a build command and returns structured success/failure with errors and warnings.",
    register: registerBuildTool,
  },
  {
    name: "esbuild",
    description:
      "Runs the esbuild bundler and returns structured errors, warnings, and output files.",
    register: registerEsbuildTool,
  },
  {
    name: "vite-build",
    description: "Runs Vite production build and returns structured output files with sizes.",
    register: registerViteBuildTool,
  },
  {
    name: "webpack",
    description:
      "Runs webpack build with JSON stats output and returns structured assets, errors, and warnings.",
    register: registerWebpackTool,
  },
  {
    name: "turbo",
    description:
      "Runs Turborepo tasks and returns structured per-package results with cache hit/miss info.",
    register: registerTurboTool,
  },
  {
    name: "nx",
    description:
      "Runs Nx workspace commands and returns structured per-project task results with cache status.",
    register: registerNxTool,
  },
  {
    name: "lerna",
    description:
      "Runs Lerna monorepo commands (list, run, changed, version) and returns structured package information.",
    register: registerLernaTool,
  },
  {
    name: "rollup",
    description:
      "Runs Rollup bundler and returns structured bundle output with errors and warnings.",
    register: registerRollupTool,
  },
];

/** Registers all Build tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("build", name);
  const isCore = (name: string) => isCoreToolForServer("build", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "build");
  }
}
