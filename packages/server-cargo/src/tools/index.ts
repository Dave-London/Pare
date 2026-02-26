import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerBuildTool } from "./build.js";
import { registerTestTool } from "./test.js";
import { registerClippyTool } from "./clippy.js";
import { registerRunTool } from "./run.js";
import { registerAddTool } from "./add.js";
import { registerRemoveTool } from "./remove.js";
import { registerFmtTool } from "./fmt.js";
import { registerDocTool } from "./doc.js";
import { registerCheckTool } from "./check.js";
import { registerUpdateTool } from "./update.js";
import { registerTreeTool } from "./tree.js";
import { registerAuditTool } from "./audit.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "build",
    description:
      "Runs cargo build and returns structured diagnostics (file, line, code, severity, message).",
    register: registerBuildTool,
  },
  {
    name: "test",
    description:
      "Runs cargo test and returns structured test results (name, status, pass/fail counts).",
    register: registerTestTool,
  },
  {
    name: "clippy",
    description: "Runs cargo clippy and returns structured lint diagnostics.",
    register: registerClippyTool,
  },
  {
    name: "run",
    description: "Runs a cargo binary and returns structured output (exit code, stdout, stderr).",
    register: registerRunTool,
  },
  {
    name: "add",
    description: "Adds dependencies to a Rust project and returns structured output.",
    register: registerAddTool,
  },
  {
    name: "remove",
    description: "Removes dependencies from a Rust project and returns structured output.",
    register: registerRemoveTool,
  },
  {
    name: "fmt",
    description: "Checks or fixes Rust formatting and returns structured output.",
    register: registerFmtTool,
  },
  {
    name: "doc",
    description: "Generates Rust documentation and returns structured output with warning count.",
    register: registerDocTool,
  },
  {
    name: "check",
    description:
      "Runs cargo check (type check without full build) and returns structured diagnostics.",
    register: registerCheckTool,
  },
  {
    name: "update",
    description: "Updates dependencies in the lock file. Optionally updates a single package.",
    register: registerUpdateTool,
  },
  {
    name: "tree",
    description: "Displays the dependency tree for a Rust project.",
    register: registerTreeTool,
  },
  {
    name: "audit",
    description: "Runs cargo audit and returns structured vulnerability data.",
    register: registerAuditTool,
  },
];

/** Registers all Cargo tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("cargo", name);
  const isCore = (name: string) => isCoreToolForServer("cargo", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "cargo");
  }
}
