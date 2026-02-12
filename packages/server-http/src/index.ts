#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/http", version: "0.7.0" },
  {
    instructions:
      "Structured HTTP request operations via curl (request, get, post, head). Use instead of running curl commands via bash. Returns typed JSON with status, headers, body, timing, and size.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
