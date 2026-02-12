import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeDownOutput } from "../lib/parsers.js";
import { formatComposeDown } from "../lib/formatters.js";
import { DockerComposeDownSchema } from "../schemas/index.js";

export function registerComposeDownTool(server: McpServer) {
  server.registerTool(
    "compose-down",
    {
      title: "Docker Compose Down",
      description:
        "Stops Docker Compose services and returns structured status. Use instead of running `docker compose down` in the terminal.",
      inputSchema: {
        path: z.string().describe("Directory containing docker-compose.yml"),
        volumes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Also remove named volumes (default: false)"),
        removeOrphans: z
          .boolean()
          .optional()
          .default(false)
          .describe("Remove orphan containers (default: false)"),
        file: z.string().optional().describe("Compose file path (default: docker-compose.yml)"),
      },
      outputSchema: DockerComposeDownSchema,
    },
    async ({ path, volumes, removeOrphans, file }) => {
      if (file) assertNoFlagInjection(file, "file");

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("down");
      if (volumes) args.push("--volumes");
      if (removeOrphans) args.push("--remove-orphans");

      const result = await docker(args, path);
      const data = parseComposeDownOutput(result.stdout, result.stderr, result.exitCode);

      if (result.exitCode !== 0 && data.stopped === 0 && data.removed === 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose down failed: ${errorMsg.trim()}`);
      }

      return dualOutput(data, formatComposeDown);
    },
  );
}
