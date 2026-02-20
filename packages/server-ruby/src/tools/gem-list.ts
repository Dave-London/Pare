import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { gemCmd } from "../lib/ruby-runner.js";
import { parseGemList } from "../lib/parsers.js";
import { formatGemList, compactGemListMap, formatGemListCompact } from "../lib/formatters.js";
import { GemListResultSchema } from "../schemas/index.js";

/** Registers the `gem-list` tool on the given MCP server. */
export function registerGemListTool(server: McpServer) {
  server.registerTool(
    "gem-list",
    {
      title: "Gem List",
      description:
        "Lists installed Ruby gems with version information. Returns structured JSON with gem names and versions.",
      inputSchema: {
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Regex filter on gem names (client-side)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: GemListResultSchema,
    },
    async ({ filter, path, compact }) => {
      if (filter) assertNoFlagInjection(filter, "filter");

      const cwd = path || process.cwd();
      const result = await gemCmd(["list", "--local"], cwd);

      let data = parseGemList(result.stdout);

      // Apply client-side filter if provided
      if (filter) {
        const re = new RegExp(filter);
        data = {
          gems: data.gems.filter((g) => re.test(g.name)),
          total: 0,
        };
        data.total = data.gems.length;
      }

      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGemList,
        compactGemListMap,
        formatGemListCompact,
        compact === false,
      );
    },
  );
}
