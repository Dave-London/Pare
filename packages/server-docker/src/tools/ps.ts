import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parsePsJson } from "../lib/parsers.js";
import { formatPs, compactPsMap, formatPsCompact } from "../lib/formatters.js";
import { DockerPsSchema } from "../schemas/index.js";

/** Registers the `ps` tool on the given MCP server. */
export function registerPsTool(server: McpServer) {
  server.registerTool(
    "ps",
    {
      title: "Docker PS",
      description: "Lists Docker containers with structured status, ports, and state information.",
      inputSchema: {
        all: z
          .boolean()
          .optional()
          .default(true)
          .describe("Show all containers (default: true, includes stopped)"),
        last: z.number().optional().describe("Show only the N most recently created containers"),
        size: z
          .boolean()
          .optional()
          .default(false)
          .describe("Display total file sizes per container (default: false)"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by status, name, label, network (--filter)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: DockerPsSchema,
    },
    async ({ all, last, size, filter, compact }) => {
      if (filter) assertNoFlagInjection(filter, "filter");

      const args = ["ps", "--format", "json", "--no-trunc"];
      if (all) args.push("-a");
      if (last != null) args.push("--last", String(last));
      if (size) args.push("-s");
      if (filter) args.push("--filter", filter);
      const result = await docker(args);
      const data = parsePsJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPs,
        compactPsMap,
        formatPsCompact,
        compact === false,
      );
    },
  );
}
