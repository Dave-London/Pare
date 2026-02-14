#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/security", version: "0.1.0" },
  {
    instructions:
      "Structured security scanning operations (trivy). Returns typed JSON with vulnerability data. Use instead of running trivy in the terminal.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
