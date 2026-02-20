#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/jvm", version: "0.1.0" },
  {
    instructions:
      "Structured JVM build tool operations (Gradle, Maven). Run builds, tests, list tasks, show dependencies. Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
