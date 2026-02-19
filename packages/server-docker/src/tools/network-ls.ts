import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseNetworkLsJson } from "../lib/parsers.js";
import { formatNetworkLs, compactNetworkLsMap, formatNetworkLsCompact } from "../lib/formatters.js";
import { DockerNetworkLsSchema } from "../schemas/index.js";

/** Registers the `network-ls` tool on the given MCP server. */
export function registerNetworkLsTool(server: McpServer) {
  server.registerTool(
    "network-ls",
    {
      title: "Docker Network LS",
      description: "Lists Docker networks with structured driver and scope information.",
      inputSchema: {
        path: cwdPathInput,
        filter: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            "Filter by driver, name, scope, label, type. String or string[] for multiple filters.",
          ),
        noTrunc: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not truncate network IDs (default: false)"),
        compact: compactInput,
      },
      outputSchema: DockerNetworkLsSchema,
    },
    async ({ path, filter, noTrunc, compact }) => {
      const filters = filter ? (Array.isArray(filter) ? filter : [filter]) : [];
      for (const f of filters) {
        assertNoFlagInjection(f, "filter");
      }

      const args = ["network", "ls", "--format", "json"];
      if (noTrunc) args.push("--no-trunc");
      for (const f of filters) {
        args.push("--filter", f);
      }
      const result = await docker(args, path);
      const data = parseNetworkLsJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatNetworkLs,
        compactNetworkLsMap,
        formatNetworkLsCompact,
        compact === false,
      );
    },
  );
}
