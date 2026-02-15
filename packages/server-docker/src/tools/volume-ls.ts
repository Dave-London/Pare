import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
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
