#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/docker", version: "0.2.0" },
  {
    instructions:
      "Structured Docker operations (ps, build, logs, images). Use instead of running docker commands via bash. Returns typed JSON with structured container, image, and build data.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
