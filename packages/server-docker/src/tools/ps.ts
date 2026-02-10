import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parsePsJson } from "../lib/parsers.js";
import { formatPs } from "../lib/formatters.js";
import { DockerPsSchema } from "../schemas/index.js";

export function registerPsTool(server: McpServer) {
  server.registerTool(
    "ps",
    {
      title: "Docker PS",
      description:
        "Lists Docker containers with structured status, ports, and state information. Use instead of running `docker ps` in the terminal.",
      inputSchema: {
        all: z
          .boolean()
          .optional()
          .default(true)
          .describe("Show all containers (default: true, includes stopped)"),
      },
      outputSchema: DockerPsSchema,
    },
    async ({ all }) => {
      const args = ["ps", "--format", "json", "--no-trunc"];
      if (all) args.push("-a");
      const result = await docker(args);
      const data = parsePsJson(result.stdout);
      return dualOutput(data, formatPs);
    },
  );
}
