#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/cargo", version: "0.2.0" },
  {
    instructions:
      "Structured Rust/Cargo operations (build, test, clippy). Use instead of running cargo commands via bash. Returns typed JSON with structured compiler errors, test results, and lint warnings.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
