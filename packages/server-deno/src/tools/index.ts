import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerRunTool } from "./run.js";
import { registerTestTool } from "./test.js";
import { registerFmtTool } from "./fmt.js";
import { registerLintTool } from "./lint.js";
import { registerCheckTool } from "./check.js";
import { registerTaskTool } from "./task.js";
import { registerInfoTool } from "./info.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Runs a Deno script with `deno run` and returns structured output (stdout, stderr, exit code, duration).",
    register: registerRunTool,
  },
  {
    name: "test",
    description: "Runs `deno test` and returns structured pass/fail output with per-test results.",
    register: registerTestTool,
  },
  {
    name: "fmt",
    description:
      "Runs `deno fmt` to check or write code formatting. Returns structured list of affected files.",
    register: registerFmtTool,
  },
  {
    name: "lint",
    description:
      "Runs `deno lint` and returns structured diagnostics with file, line, column, code, and message.",
    register: registerLintTool,
  },
  {
    name: "check",
    description:
      "Runs `deno check` for type-checking without execution. Returns structured type errors.",
    register: registerCheckTool,
  },
  {
    name: "task",
    description: "Runs a named task from deno.json via `deno task` and returns structured output.",
    register: registerTaskTool,
  },
  {
    name: "info",
    description:
      "Runs `deno info` to show dependency information for a module. Returns structured dependency data.",
    register: registerInfoTool,
  },
];

/** Registers all Deno tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("deno", name);
  const isCore = (name: string) => isCoreToolForServer("deno", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "deno");
  }
}
