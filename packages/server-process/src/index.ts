#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/process", version: "0.8.1" },
  {
    instructions:
      "Structured process execution (run). Runs commands with timeout, environment, and signal support. Returns typed JSON with exit code, stdout, stderr, duration, and timeout status.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
