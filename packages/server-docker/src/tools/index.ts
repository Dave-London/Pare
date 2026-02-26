import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerPsTool } from "./ps.js";
import { registerBuildTool } from "./build.js";
import { registerLogsTool } from "./logs.js";
import { registerImagesTool } from "./images.js";
import { registerRunTool } from "./run.js";
import { registerExecTool } from "./exec.js";
import { registerComposeUpTool } from "./compose-up.js";
import { registerComposeDownTool } from "./compose-down.js";
import { registerPullTool } from "./pull.js";
import { registerInspectTool } from "./inspect.js";
import { registerNetworkLsTool } from "./network-ls.js";
import { registerVolumeLsTool } from "./volume-ls.js";
import { registerComposePsTool } from "./compose-ps.js";
import { registerComposeLogsTool } from "./compose-logs.js";
import { registerComposeBuildTool } from "./compose-build.js";
import { registerStatsTool } from "./stats.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "ps",
    description: "Lists Docker containers with structured status, ports, and state information.",
    register: registerPsTool,
  },
  {
    name: "build",
    description:
      "Builds a Docker image and returns structured build results including image ID, duration, and errors.",
    register: registerBuildTool,
  },
  {
    name: "logs",
    description: "Retrieves container logs as structured line arrays.",
    register: registerLogsTool,
  },
  {
    name: "images",
    description: "Lists Docker images with structured repository, tag, size, and creation info.",
    register: registerImagesTool,
  },
  {
    name: "run",
    description:
      "Runs a Docker container from an image and returns structured container ID and status.",
    register: registerRunTool,
  },
  {
    name: "exec",
    description:
      "Executes arbitrary commands inside a running Docker container and returns structured output.",
    register: registerExecTool,
  },
  {
    name: "compose-up",
    description: "Starts Docker Compose services and returns structured status.",
    register: registerComposeUpTool,
  },
  {
    name: "compose-down",
    description: "Stops Docker Compose services and returns structured status.",
    register: registerComposeDownTool,
  },
  {
    name: "pull",
    description:
      "Pulls a Docker image from a registry and returns structured result with digest info.",
    register: registerPullTool,
  },
  {
    name: "inspect",
    description:
      "Shows detailed container or image information with structured state, image, and platform data.",
    register: registerInspectTool,
  },
  {
    name: "network-ls",
    description: "Lists Docker networks with structured driver and scope information.",
    register: registerNetworkLsTool,
  },
  {
    name: "volume-ls",
    description: "Lists Docker volumes with structured driver, mountpoint, and scope information.",
    register: registerVolumeLsTool,
  },
  {
    name: "compose-ps",
    description: "Lists Docker Compose services with structured state and status information.",
    register: registerComposePsTool,
  },
  {
    name: "compose-logs",
    description: "Retrieves Docker Compose service logs as structured entries.",
    register: registerComposeLogsTool,
  },
  {
    name: "compose-build",
    description:
      "Builds Docker Compose service images and returns structured per-service build status.",
    register: registerComposeBuildTool,
  },
  {
    name: "stats",
    description:
      "Returns a snapshot of container resource usage (CPU, memory, network/block I/O, PIDs) as structured data.",
    register: registerStatsTool,
  },
];

/** Registers all Docker tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("docker", name);
  const isCore = (name: string) => isCoreToolForServer("docker", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "docker");
  }
}
