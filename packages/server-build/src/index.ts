#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/build", version: "0.2.0" },
  {
    instructions:
      "Structured build tool operations (tsc, generic build). Use instead of running build commands via bash. Returns typed JSON with structured error diagnostics and build results.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
