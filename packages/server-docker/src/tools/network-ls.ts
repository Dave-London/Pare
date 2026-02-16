import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
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
      description:
        "Lists Docker networks with structured driver and scope information. Use instead of running `docker network ls` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        noTrunc: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not truncate network IDs (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerNetworkLsSchema,
    },
    async ({ path, noTrunc, compact }) => {
      const args = ["network", "ls", "--format", "json"];
      if (noTrunc) args.push("--no-trunc");
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
