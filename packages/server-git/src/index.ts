#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/git", version: "0.2.0" },
  {
    instructions:
      "Structured git operations (status, log, diff, branch, show). Use instead of running git commands via bash. Returns typed JSON with significantly fewer tokens than raw CLI output.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
