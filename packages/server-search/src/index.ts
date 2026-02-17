#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/search", version: "0.8.1" },
  {
    instructions:
      "Structured code search operations (ripgrep + fd). Returns typed JSON with match locations, file lists, and match counts.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
