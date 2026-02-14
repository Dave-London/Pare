#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/go", version: "0.8.1" },
  {
    instructions:
      "Structured Go toolchain operations (build, test, vet, run, mod-tidy, fmt, generate). Use instead of running go commands via bash. Returns typed JSON with structured compiler errors, test results, vet warnings, run output, and more.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
