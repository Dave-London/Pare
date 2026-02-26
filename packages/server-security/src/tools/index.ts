import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerTrivyTool } from "./trivy.js";
import { registerSemgrepTool } from "./semgrep.js";
import { registerGitleaksTool } from "./gitleaks.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "trivy",
    description:
      "Runs Trivy vulnerability/misconfiguration scanner on container images, filesystems, or IaC configs. Returns structured vulnerability data with severity summary.",
    register: registerTrivyTool,
  },
  {
    name: "semgrep",
    description:
      "Runs Semgrep static analysis with structured rules and findings. Returns structured finding data with severity summary.",
    register: registerSemgrepTool,
  },
  {
    name: "gitleaks",
    description:
      "Runs Gitleaks to detect hardcoded secrets in git repositories. Returns structured finding data with redacted secrets.",
    register: registerGitleaksTool,
  },
];

/** Registers all Security tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("security", name);
  const isCore = (name: string) => isCoreToolForServer("security", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "security");
  }
}
