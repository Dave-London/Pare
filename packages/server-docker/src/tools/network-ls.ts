import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseNetworkLsJson } from "../lib/parsers.js";
import { formatNetworkLs, compactNetworkLsMap, formatNetworkLsCompact } from "../lib/formatters.js";
import { DockerNetworkLsSchema } from "../schemas/index.js";

export function registerNetworkLsTool(server: McpServer) {
  server.registerTool(
    "network-ls",
    {
      title: "Docker Network LS",
      description:
        "Lists Docker networks with structured driver and scope information.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerNetworkLsSchema,
    },
    async ({ path, compact }) => {
      const args = ["network", "ls", "--format", "json"];
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
