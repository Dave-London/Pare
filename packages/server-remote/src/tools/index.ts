import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerSshRunTool } from "./ssh-run.js";
import { registerSshTestTool } from "./ssh-test.js";
import { registerSshKeyscanTool } from "./ssh-keyscan.js";
import { registerRsyncTool } from "./rsync.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "ssh-run",
    description:
      "Executes a command on a remote host via SSH. Returns structured output with stdout, stderr, exit code, and duration.",
    register: registerSshRunTool,
  },
  {
    name: "ssh-test",
    description:
      "Tests SSH connectivity to a remote host. Returns whether the host is reachable and any banner message.",
    register: registerSshTestTool,
  },
  {
    name: "ssh-keyscan",
    description: "Retrieves public host keys from a remote SSH server using `ssh-keyscan`.",
    register: registerSshKeyscanTool,
  },
  {
    name: "rsync",
    description:
      "Syncs files between local and remote locations using rsync. Defaults to dry-run mode for safety.",
    register: registerRsyncTool,
  },
];

/** Registers all Remote tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("remote", name);
  const isCore = (name: string) => isCoreToolForServer("remote", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "remote");
  }
}
