import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseVolumeLsJson } from "../lib/parsers.js";
import { formatVolumeLs, compactVolumeLsMap, formatVolumeLsCompact } from "../lib/formatters.js";
import { DockerVolumeLsSchema } from "../schemas/index.js";

/** Registers the `volume-ls` tool on the given MCP server. */
export function registerVolumeLsTool(server: McpServer) {
  server.registerTool(
    "volume-ls",
    {
      title: "Docker Volume LS",
      description:
        "Lists Docker volumes with structured driver, mountpoint, and scope information. Use instead of running `docker volume ls` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        filter: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            "Filter by dangling, driver, label, name. String or string[] for multiple filters.",
          ),
        cluster: z
          .boolean()
          .optional()
          .default(false)
          .describe("Display cluster volumes from Docker Swarm (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerVolumeLsSchema,
    },
    async ({ path, filter, cluster, compact }) => {
      const filters = filter ? (Array.isArray(filter) ? filter : [filter]) : [];
      for (const f of filters) {
        assertNoFlagInjection(f, "filter");
      }

      const args = ["volume", "ls", "--format", "json"];
      if (cluster) args.push("--cluster");
      for (const f of filters) {
        args.push("--filter", f);
      }
      const result = await docker(args, path);
      const data = parseVolumeLsJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatVolumeLs,
        compactVolumeLsMap,
        formatVolumeLsCompact,
        compact === false,
      );
    },
  );
}
