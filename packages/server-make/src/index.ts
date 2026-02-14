#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/make", version: "0.8.1" },
  {
    instructions:
      "Structured Make/Just task runner operations (run, list). Auto-detects make vs just. Returns typed JSON. Use instead of running make/just in the terminal.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
