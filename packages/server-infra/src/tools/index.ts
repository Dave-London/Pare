import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerInitTool } from "./init.js";
import { registerPlanTool } from "./plan.js";
import { registerValidateTool } from "./validate.js";
import { registerFmtTool } from "./fmt.js";
import { registerOutputTool } from "./output.js";
import { registerStateListTool } from "./state-list.js";
import { registerWorkspaceTool } from "./workspace.js";
import { registerShowTool } from "./show.js";
import { registerVagrantTool } from "./vagrant.js";
import { registerAnsiblePlaybookTool } from "./ansible-playbook.js";
import { registerAnsibleInventoryTool } from "./ansible-inventory.js";
import { registerAnsibleGalaxyTool } from "./ansible-galaxy.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "init",
    description:
      "Initializes a Terraform working directory. Downloads providers, configures backend, and prepares for plan/apply.",
    register: registerInitTool,
  },
  {
    name: "plan",
    description: "Shows the Terraform execution plan with resource change counts. Read-only.",
    register: registerPlanTool,
  },
  {
    name: "validate",
    description:
      "Validates Terraform configuration files for syntax and consistency errors. Returns structured diagnostics.",
    register: registerValidateTool,
  },
  {
    name: "fmt",
    description:
      "Checks Terraform configuration formatting. Lists files that need formatting and optionally shows diffs.",
    register: registerFmtTool,
  },
  {
    name: "output",
    description:
      "Shows Terraform output values from the current state. Returns structured name/value/type/sensitive data.",
    register: registerOutputTool,
  },
  {
    name: "state-list",
    description: "Lists all resources tracked in the Terraform state. Returns resource addresses.",
    register: registerStateListTool,
  },
  {
    name: "workspace",
    description: "Manages Terraform workspaces: list, select, create, or delete workspaces.",
    register: registerWorkspaceTool,
  },
  {
    name: "show",
    description: "Shows the current Terraform state or a saved plan file in structured JSON.",
    register: registerShowTool,
  },
  {
    name: "vagrant",
    description: "Manages Vagrant VMs: status, global-status, up, halt, destroy.",
    register: registerVagrantTool,
  },
  {
    name: "ansible-playbook",
    description:
      "Runs an Ansible playbook and returns structured play recap with per-host results.",
    register: registerAnsiblePlaybookTool,
  },
  {
    name: "ansible-inventory",
    description: "Queries Ansible inventory for hosts, groups, and variables.",
    register: registerAnsibleInventoryTool,
  },
  {
    name: "ansible-galaxy",
    description:
      "Installs or lists Ansible collections and roles from Galaxy or a requirements file.",
    register: registerAnsibleGalaxyTool,
  },
];

/** Registers all Infra tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("infra", name);
  const isCore = (name: string) => isCoreToolForServer("infra", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "infra");
  }
}
