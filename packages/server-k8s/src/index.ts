#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/k8s", version: "0.8.1" },
  {
    instructions:
      "Structured Kubernetes kubectl and Helm operations (get, describe, logs, apply, helm). Returns typed JSON. Use instead of running kubectl/helm in the terminal.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
