import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerGetTool } from "./get.js";
import { registerDescribeTool } from "./describe.js";
import { registerLogsTool } from "./logs.js";
import { registerApplyTool } from "./apply.js";
import { registerHelmTool } from "./helm.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "get",
    description: "Gets Kubernetes resources and returns structured JSON output.",
    register: registerGetTool,
  },
  {
    name: "describe",
    description: "Describes a Kubernetes resource with detailed information.",
    register: registerDescribeTool,
  },
  { name: "logs", description: "Gets logs from a Kubernetes pod.", register: registerLogsTool },
  {
    name: "apply",
    description: "Applies a Kubernetes manifest file.",
    register: registerApplyTool,
  },
  {
    name: "helm",
    description:
      "Manages Helm releases (install, upgrade, list, status, history, template). Returns structured JSON output.",
    register: registerHelmTool,
  },
];

/** Registers all Kubernetes tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("k8s", name);
  const isCore = (name: string) => isCoreToolForServer("k8s", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "k8s");
  }
}
