#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer(
  { name: "@paretools/ruby", version: "0.1.0" },
  {
    instructions:
      "Structured Ruby & Bundler operations (run, check, gem-list, gem-install, gem-outdated, bundle-install, bundle-exec, bundle-check). Returns typed JSON.",
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
