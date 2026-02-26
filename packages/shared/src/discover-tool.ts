/**
 * The `discover-tools` meta-tool — allows LLM clients to discover and load
 * tools that were deferred at startup for token efficiency.
 *
 * Each server registers this tool when lazy mode is active and at least one
 * tool was deferred. Calling it with no arguments lists available tools;
 * passing tool names in `load` immediately registers them.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "./output.js";
import type { LazyToolManager } from "./lazy-tools.js";

/** Zod schema for the discover-tools output. */
const DiscoverToolsOutputSchema = {
  available: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  loaded: z.array(z.string()),
  totalAvailable: z.number(),
};

function formatDiscoverTools(data: {
  available: Array<{ name: string; description: string }>;
  loaded: string[];
  totalAvailable: number;
}): string {
  const lines: string[] = [];

  if (data.loaded.length > 0) {
    lines.push(`Loaded ${data.loaded.length} tool(s): ${data.loaded.join(", ")}`);
    lines.push("");
  }

  if (data.available.length > 0) {
    lines.push(`${data.totalAvailable} additional tool(s) available:`);
    for (const tool of data.available) {
      lines.push(`  - ${tool.name}: ${tool.description}`);
    }
  } else {
    lines.push("All tools are loaded.");
  }

  return lines.join("\n");
}

/**
 * Registers the `discover-tools` meta-tool on the given server.
 *
 * @param server - The MCP server to register on.
 * @param manager - The lazy tool manager tracking deferred tools.
 * @param serverName - Human-readable server name for the tool description.
 */
export function registerDiscoverTool(
  server: McpServer,
  manager: LazyToolManager,
  serverName: string,
): void {
  server.registerTool(
    "discover-tools",
    {
      title: "Discover Available Tools",
      description: `List and load additional ${serverName} tools that aren't loaded by default. Use this to find tools for less common operations.`,
      inputSchema: {
        load: z.array(z.string()).optional().describe("Tool names to load immediately"),
      },
      outputSchema: DiscoverToolsOutputSchema,
    },
    async (args) => {
      const loaded: string[] = [];
      if (args.load) {
        for (const name of args.load) {
          if (manager.loadTool(name)) {
            loaded.push(name);
          }
        }
      }

      const available = manager.listLazy();
      const result = {
        available,
        loaded,
        totalAvailable: available.length,
      };

      return dualOutput(result, formatDiscoverTools);
    },
  );
}
