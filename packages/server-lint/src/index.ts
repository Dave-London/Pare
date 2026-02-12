#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/lint", version: "0.7.0" },
  {
    instructions:
      "Structured linting and formatting operations (ESLint, Prettier, Biome). Use instead of running lint/format commands via bash. Returns typed JSON with structured violation details and counts.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
