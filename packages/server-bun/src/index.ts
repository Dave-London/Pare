#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/bun", version: "0.1.0" },
  {
    instructions:
      "Structured Bun runtime operations (run, test, build, install, add, remove, outdated, pm-ls). Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
