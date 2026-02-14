#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/npm", version: "0.8.1" },
  {
    instructions:
      "Structured npm/pnpm operations (install, audit, outdated, list, run, test, init). Use instead of running npm commands via bash. Returns typed JSON with structured dependency, vulnerability, and script execution data.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
