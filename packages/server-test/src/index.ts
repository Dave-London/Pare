#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/test", version: "0.2.0" },
  {
    instructions:
      "Structured test runner operations (run, coverage). Auto-detects pytest, jest, vitest, and mocha. Use instead of running test commands via bash. Returns typed JSON with structured pass/fail results and failure details.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
