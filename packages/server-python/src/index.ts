#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/python", version: "0.2.0" },
  {
    instructions:
      "Structured Python tool operations (pip install, mypy, ruff, pip-audit). Use instead of running Python tool commands via bash. Returns typed JSON with structured type errors, lint violations, and vulnerability data.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
