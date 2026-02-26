import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerRunTool } from "./run.js";
import { registerPublishTool } from "./publish.js";
import { registerRestoreTool } from "./restore.js";
import { registerCleanTool } from "./clean.js";
import { registerAddPackageTool } from "./add-package.js";
import { registerListPackageTool } from "./list-package.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "build",
    description:
      "Runs dotnet build and returns structured diagnostics (file, line, column, code, severity, message).",
    register: registerBuildTool,
  },
  {
    name: "test",
    description:
      "Runs dotnet test and returns structured test results (name, status, pass/fail counts).",
    register: registerTestTool,
  },
  {
    name: "run",
    description:
      "Runs a .NET application and returns structured output (exit code, stdout, stderr).",
    register: registerRunTool,
  },
  {
    name: "publish",
    description:
      "Runs dotnet publish for deployment and returns structured output with output path and diagnostics.",
    register: registerPublishTool,
  },
  {
    name: "restore",
    description:
      "Runs dotnet restore to restore NuGet dependencies and returns structured results.",
    register: registerRestoreTool,
  },
  {
    name: "clean",
    description: "Runs dotnet clean to remove build outputs and returns structured results.",
    register: registerCleanTool,
  },
  {
    name: "add-package",
    description: "Runs dotnet add package to add a NuGet package and returns structured results.",
    register: registerAddPackageTool,
  },
  {
    name: "list-package",
    description:
      "Runs dotnet list package and returns structured NuGet package listings per project and framework.",
    register: registerListPackageTool,
  },
];

/** Registers all .NET tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("dotnet", name);
  const isCore = (name: string) => isCoreToolForServer("dotnet", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "dotnet");
  }
}
