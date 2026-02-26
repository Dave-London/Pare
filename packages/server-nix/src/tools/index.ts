import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerRunTool } from "./run.js";
import { registerDevelopTool } from "./develop.js";
import { registerShellTool } from "./shell.js";
import { registerFlakeShowTool } from "./flake-show.js";
import { registerFlakeCheckTool } from "./flake-check.js";
import { registerFlakeUpdateTool } from "./flake-update.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "build",
    description: "Builds a Nix derivation and returns structured output paths and diagnostics.",
    register: registerBuildTool,
  },
  {
    name: "run",
    description:
      "Runs a Nix application from an installable and returns stdout, stderr, exit code, and duration.",
    register: registerRunTool,
  },
  {
    name: "develop",
    description:
      "Enters or queries a Nix dev shell. When a command is provided, runs it inside the dev shell.",
    register: registerDevelopTool,
  },
  {
    name: "shell",
    description: "Makes packages available in the environment and optionally runs a command.",
    register: registerShellTool,
  },
  {
    name: "flake-show",
    description: "Shows the outputs of a Nix flake as a structured tree.",
    register: registerFlakeShowTool,
  },
  {
    name: "flake-check",
    description:
      "Checks a Nix flake for errors and returns structured check results, warnings, and errors.",
    register: registerFlakeCheckTool,
  },
  {
    name: "flake-update",
    description:
      "Updates flake lock file inputs and returns structured information about what was updated.",
    register: registerFlakeUpdateTool,
  },
];

/** Registers all Nix tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("nix", name);
  const isCore = (name: string) => isCoreToolForServer("nix", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "nix");
  }
}
