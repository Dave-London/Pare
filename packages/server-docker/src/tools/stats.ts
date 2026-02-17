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
        "Returns a snapshot of container resource usage (CPU, memory, network/block I/O, PIDs) as structured data.",
      inputSchema: {
        containers: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .optional()
          .describe("Container names or IDs to filter (default: all running containers)"),
        all: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show all containers including stopped (default: false)"),
        noTrunc: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not truncate container IDs (default: false)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory, consistent with all other Docker tools"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: DockerStatsSchema,
    },
    async ({ containers, all, noTrunc, path, compact }) => {
      if (containers) {
        for (const c of containers) {
          assertNoFlagInjection(c, "container");
        }
      }

      const args = ["stats", "--no-stream", "--format", "{{json .}}"];
      if (all) args.push("--all");
      if (noTrunc) args.push("--no-trunc");
      if (containers && containers.length > 0) {
        args.push(...containers);
      }

      const result = await docker(args, path);
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
