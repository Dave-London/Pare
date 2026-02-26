import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerVetTool } from "./vet.js";
import { registerRunTool } from "./run.js";
import { registerModTidyTool } from "./mod-tidy.js";
import { registerFmtTool } from "./fmt.js";
import { registerGenerateTool } from "./generate.js";
import { registerEnvTool } from "./env.js";
import { registerListTool } from "./list.js";
import { registerGetTool } from "./get.js";
import { registerGolangciLintTool } from "./golangci-lint.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "build",
    description: "Runs go build and returns structured error list (file, line, column, message).",
    register: registerBuildTool,
  },
  {
    name: "test",
    description:
      "Runs go test and returns structured test results (name, status, package, elapsed).",
    register: registerTestTool,
  },
  {
    name: "vet",
    description:
      "Runs go vet and returns structured static analysis diagnostics with analyzer names.",
    register: registerVetTool,
  },
  {
    name: "run",
    description: "Runs a Go program and returns structured output (stdout, stderr, exit code).",
    register: registerRunTool,
  },
  {
    name: "mod-tidy",
    description: "Runs go mod tidy to add missing and remove unused module dependencies.",
    register: registerModTidyTool,
  },
  {
    name: "fmt",
    description: "Checks or fixes Go source formatting using gofmt.",
    register: registerFmtTool,
  },
  {
    name: "generate",
    description: "Runs go generate directives in Go source files.",
    register: registerGenerateTool,
  },
  {
    name: "env",
    description: "Returns Go environment variables as structured JSON.",
    register: registerEnvTool,
  },
  {
    name: "list",
    description: "Lists Go packages or modules and returns structured information.",
    register: registerListTool,
  },
  {
    name: "get",
    description: "Downloads and installs Go packages and their dependencies.",
    register: registerGetTool,
  },
  {
    name: "golangci-lint",
    description:
      "Runs golangci-lint and returns structured lint diagnostics (file, line, linter, severity, message).",
    register: registerGolangciLintTool,
  },
];

/** Registers all Go tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("go", name);
  const isCore = (name: string) => isCoreToolForServer("go", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "go");
  }
}
