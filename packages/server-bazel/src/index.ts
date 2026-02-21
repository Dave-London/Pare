#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/bazel", version: "0.10.2" },
  {
    instructions:
      "Structured Bazel build system operations (build, test, query, info, run, clean, fetch). Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
