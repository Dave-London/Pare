#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/cargo", version: "0.7.0" },
  {
    instructions:
      "Structured Rust/Cargo operations (build, test, clippy, run, add, remove, fmt, doc, check). Use instead of running cargo commands via bash. Returns typed JSON with structured compiler errors, test results, lint warnings, and dependency management output.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
