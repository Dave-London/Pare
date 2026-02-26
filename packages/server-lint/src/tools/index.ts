import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerLintTool } from "./lint.js";
import { registerFormatCheckTool } from "./format-check.js";
import { registerPrettierFormatTool } from "./prettier-format.js";
import { registerBiomeCheckTool } from "./biome-check.js";
import { registerBiomeFormatTool } from "./biome-format.js";
import { registerStylelintTool } from "./stylelint.js";
import { registerOxlintTool } from "./oxlint.js";
import { registerShellcheckTool } from "./shellcheck.js";
import { registerHadolintTool } from "./hadolint.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "lint",
    description:
      "Runs ESLint and returns structured diagnostics (file, line, column, rule, severity, message).",
    register: registerLintTool,
  },
  {
    name: "format-check",
    description:
      "Checks if files are formatted and returns a structured list of files needing formatting.",
    register: registerFormatCheckTool,
  },
  {
    name: "prettier-format",
    description:
      "Formats files with Prettier (--write) and returns a structured list of changed files.",
    register: registerPrettierFormatTool,
  },
  {
    name: "biome-check",
    description:
      "Runs Biome check (lint + format) and returns structured diagnostics (file, line, rule, severity, message).",
    register: registerBiomeCheckTool,
  },
  {
    name: "biome-format",
    description:
      "Formats files with Biome (format --write) and returns a structured list of changed files.",
    register: registerBiomeFormatTool,
  },
  {
    name: "stylelint",
    description:
      "Runs Stylelint and returns structured diagnostics (file, line, column, rule, severity, message).",
    register: registerStylelintTool,
  },
  {
    name: "oxlint",
    description:
      "Runs Oxlint and returns structured diagnostics (file, line, column, rule, severity, message).",
    register: registerOxlintTool,
  },
  {
    name: "shellcheck",
    description:
      "Runs ShellCheck (shell script linter) and returns structured diagnostics (file, line, column, rule, severity, message).",
    register: registerShellcheckTool,
  },
  {
    name: "hadolint",
    description:
      "Runs Hadolint (Dockerfile linter) and returns structured diagnostics (file, line, rule, severity, message).",
    register: registerHadolintTool,
  },
];

/** Registers all Lint tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("lint", name);
  const isCore = (name: string) => isCoreToolForServer("lint", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "lint");
  }
}
