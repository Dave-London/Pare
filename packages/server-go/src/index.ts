#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/go", version: "0.2.0" },
  {
    instructions:
      "Structured Go toolchain operations (build, test, vet). Use instead of running go commands via bash. Returns typed JSON with structured compiler errors, test results, and vet warnings.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
