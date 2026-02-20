import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { gemCmd } from "../lib/ruby-runner.js";
import { parseGemOutdated } from "../lib/parsers.js";
import {
  formatGemOutdated,
  compactGemOutdatedMap,
  formatGemOutdatedCompact,
} from "../lib/formatters.js";
import { GemOutdatedResultSchema } from "../schemas/index.js";

/** Registers the `gem-outdated` tool on the given MCP server. */
export function registerGemOutdatedTool(server: McpServer) {
  server.registerTool(
    "gem-outdated",
    {
      title: "Gem Outdated",
      description: "Lists outdated Ruby gems showing current and latest available versions.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: GemOutdatedResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const result = await gemCmd(["outdated"], cwd);

      const data = parseGemOutdated(result.stdout);
      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGemOutdated,
        compactGemOutdatedMap,
        formatGemOutdatedCompact,
        compact === false,
      );
    },
  );
}
