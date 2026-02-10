#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/python", version: "0.2.0" },
  {
    instructions:
      "Structured Python tool operations (pip install, mypy, ruff, pip-audit, pytest, uv, black). Use instead of running Python tool commands via bash. Returns typed JSON with structured type errors, lint violations, vulnerability data, test results, and formatting status.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
