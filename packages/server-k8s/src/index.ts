#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/k8s", version: "0.8.1" },
  {
    instructions:
      "Structured Kubernetes kubectl operations (get, describe, logs, apply). Returns typed JSON. Use instead of running kubectl in the terminal.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
