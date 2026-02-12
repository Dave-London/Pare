import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposePsJson } from "../lib/parsers.js";
import { formatComposePs, compactComposePsMap, formatComposePsCompact } from "../lib/formatters.js";
import { DockerComposePsSchema } from "../schemas/index.js";

export function registerComposePsTool(server: McpServer) {
  server.registerTool(
    "compose-ps",
    {
      title: "Docker Compose PS",
      description:
        "Lists Docker Compose services with structured state and status information. Use instead of running `docker compose ps` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory containing docker-compose.yml (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerComposePsSchema,
    },
    async ({ path, compact }) => {
      const args = ["compose", "ps", "--format", "json"];
      const result = await docker(args, path);
      const data = parseComposePsJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatComposePs,
        compactComposePsMap,
        formatComposePsCompact,
        compact === false,
      );
    },
  );
}
