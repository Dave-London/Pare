import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseStatsJson } from "../lib/parsers.js";
import { formatStats, compactStatsMap, formatStatsCompact } from "../lib/formatters.js";
import { DockerStatsSchema } from "../schemas/index.js";

/** Registers the `stats` tool on the given MCP server. */
export function registerStatsTool(server: McpServer) {
  server.registerTool(
    "stats",
    {
      title: "Docker Stats",
      description:
        "Returns a snapshot of container resource usage (CPU, memory, network/block I/O, PIDs) as structured data. Use instead of running `docker stats` in the terminal.",
      inputSchema: {
        containers: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .optional()
          .describe("Container names or IDs to filter (default: all running containers)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerStatsSchema,
    },
    async ({ containers, compact }) => {
      if (containers) {
        for (const c of containers) {
          assertNoFlagInjection(c, "container");
        }
      }

      const args = ["stats", "--no-stream", "--format", "{{json .}}"];
      if (containers && containers.length > 0) {
        args.push(...containers);
      }

      const result = await docker(args);
      const data = parseStatsJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatStats,
        compactStatsMap,
        formatStatsCompact,
        compact === false,
      );
    },
  );
}
