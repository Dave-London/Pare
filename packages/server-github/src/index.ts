#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/github", version: "0.8.1" },
  {
    instructions:
      "Structured GitHub operations (PRs, issues, actions runs) via gh CLI. Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
