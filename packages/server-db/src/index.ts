#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/db", version: "0.1.0" },
  {
    instructions:
      "Structured database CLI operations (psql, mysql, redis-cli, mongosh). Returns typed JSON with query results, server info, and connectivity status.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
