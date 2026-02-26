import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerPipInstallTool } from "./pip-install.js";
import { registerPipListTool } from "./pip-list.js";
import { registerPipShowTool } from "./pip-show.js";
import { registerMypyTool } from "./mypy.js";
import { registerRuffTool } from "./ruff.js";
import { registerRuffFormatTool } from "./ruff-format.js";
import { registerPipAuditTool } from "./pip-audit.js";
import { registerPytestTool } from "./pytest.js";
import { registerUvInstallTool } from "./uv-install.js";
import { registerUvRunTool } from "./uv-run.js";
import { registerBlackTool } from "./black.js";
import { registerCondaTool } from "./conda.js";
import { registerPyenvTool } from "./pyenv.js";
import { registerPoetryTool } from "./poetry.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "pip-install",
    description: "Runs pip install and returns a structured summary of installed packages.",
    register: registerPipInstallTool,
  },
  {
    name: "pip-list",
    description: "Runs pip list and returns a structured list of installed packages.",
    register: registerPipListTool,
  },
  {
    name: "pip-show",
    description:
      "Runs pip show and returns structured package metadata (name, version, summary, dependencies).",
    register: registerPipShowTool,
  },
  {
    name: "mypy",
    description:
      "Runs mypy and returns structured type-check diagnostics (file, line, severity, message, code).",
    register: registerMypyTool,
  },
  {
    name: "ruff-check",
    description:
      "Runs ruff check and returns structured lint diagnostics (file, line, code, message).",
    register: registerRuffTool,
  },
  {
    name: "ruff-format",
    description: "Runs ruff format and returns structured results (files changed, file list).",
    register: registerRuffFormatTool,
  },
  {
    name: "pip-audit",
    description: "Runs pip-audit and returns a structured vulnerability report.",
    register: registerPipAuditTool,
  },
  {
    name: "pytest",
    description:
      "Runs pytest and returns structured test results (passed, failed, errors, skipped, failures).",
    register: registerPytestTool,
  },
  {
    name: "uv-install",
    description: "Runs uv pip install and returns a structured summary of installed packages.",
    register: registerUvInstallTool,
  },
  {
    name: "uv-run",
    description: "Runs a command in a uv-managed environment and returns structured output.",
    register: registerUvRunTool,
  },
  {
    name: "black",
    description:
      "Runs Black code formatter and returns structured results (files changed, unchanged, would reformat).",
    register: registerBlackTool,
  },
  {
    name: "conda",
    description:
      "Runs conda commands (list, info, env-list, create, remove, update) and returns structured JSON output.",
    register: registerCondaTool,
  },
  { name: "pyenv", description: "Manages Python versions via pyenv.", register: registerPyenvTool },
  {
    name: "poetry",
    description: "Runs Poetry commands and returns structured output.",
    register: registerPoetryTool,
  },
];

/** Registers all Python tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("python", name);
  const isCore = (name: string) => isCoreToolForServer("python", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "python");
  }
}
