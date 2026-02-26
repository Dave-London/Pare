import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerCheckTool } from "./check.js";
import { registerGemListTool } from "./gem-list.js";
import { registerGemInstallTool } from "./gem-install.js";
import { registerGemOutdatedTool } from "./gem-outdated.js";
import { registerBundleInstallTool } from "./bundle-install.js";
import { registerBundleExecTool } from "./bundle-exec.js";
import { registerBundleCheckTool } from "./bundle-check.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Executes a Ruby script file and returns structured output (stdout, stderr, exit code, duration).",
    register: registerRunTool,
  },
  {
    name: "check",
    description:
      "Checks a Ruby file for syntax errors using `ruby -c` and returns structured validation results.",
    register: registerCheckTool,
  },
  {
    name: "gem-list",
    description:
      "Lists installed Ruby gems with version information. Returns structured JSON with gem names and versions.",
    register: registerGemListTool,
  },
  {
    name: "gem-install",
    description:
      "Installs a Ruby gem using `gem install` and returns structured output with success status and duration.",
    register: registerGemInstallTool,
  },
  {
    name: "gem-outdated",
    description: "Lists outdated Ruby gems showing current and latest available versions.",
    register: registerGemOutdatedTool,
  },
  {
    name: "bundle-install",
    description:
      "Installs Gemfile dependencies using `bundle install` and returns structured output.",
    register: registerBundleInstallTool,
  },
  {
    name: "bundle-exec",
    description: "Executes a command in the context of the Gemfile bundle using `bundle exec`.",
    register: registerBundleExecTool,
  },
  {
    name: "bundle-check",
    description: "Verifies that the Gemfile's dependencies are satisfied without installing them.",
    register: registerBundleCheckTool,
  },
];

/** Registers all Ruby tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("ruby", name);
  const isCore = (name: string) => isCoreToolForServer("ruby", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "ruby");
  }
}
