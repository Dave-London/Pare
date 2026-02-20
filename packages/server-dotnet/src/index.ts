#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/dotnet", version: "0.1.0" },
  {
    instructions:
      "Structured .NET CLI operations (build, test, run, publish, restore, clean, add-package, list-package). Returns typed JSON with significantly fewer tokens than raw CLI output.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
