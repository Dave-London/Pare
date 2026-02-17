#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/build", version: "0.8.1" },
  {
    instructions:
      "Structured build tool operations (tsc, esbuild, vite, webpack, generic build). Returns typed JSON with structured error diagnostics and build results.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
