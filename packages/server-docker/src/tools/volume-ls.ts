import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseVolumeLsJson } from "../lib/parsers.js";
import { formatVolumeLs, compactVolumeLsMap, formatVolumeLsCompact } from "../lib/formatters.js";
import { DockerVolumeLsSchema } from "../schemas/index.js";

export function registerVolumeLsTool(server: McpServer) {
  server.registerTool(
    "volume-ls",
    {
      title: "Docker Volume LS",
      description:
        "Lists Docker volumes with structured driver, mountpoint, and scope information.",
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
      outputSchema: DockerVolumeLsSchema,
    },
    async ({ path, compact }) => {
      const args = ["volume", "ls", "--format", "json"];
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
