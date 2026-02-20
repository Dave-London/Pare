#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/infra", version: "0.1.0" },
  {
    instructions:
      "Structured infrastructure-as-code operations (Terraform init, plan, validate, fmt, output, state, workspace, show; Vagrant status, up, halt, destroy, global-status). Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
