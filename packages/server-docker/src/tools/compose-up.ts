import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeUpOutput } from "../lib/parsers.js";
import { formatComposeUp } from "../lib/formatters.js";
import { DockerComposeUpSchema } from "../schemas/index.js";

export function registerComposeUpTool(server: McpServer) {
  server.registerTool(
    "compose-up",
    {
      title: "Docker Compose Up",
      description:
        "Starts Docker Compose services and returns structured status. Use instead of running `docker compose up` in the terminal.",
      inputSchema: {
        path: z.string().describe("Directory containing docker-compose.yml"),
        services: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Specific services to start (default: all)"),
        detach: z.boolean().optional().default(true).describe("Run in background (default: true)"),
        build: z
          .boolean()
          .optional()
          .default(false)
          .describe("Build images before starting (default: false)"),
        file: z.string().optional().describe("Compose file path (default: docker-compose.yml)"),
      },
      outputSchema: DockerComposeUpSchema,
    },
    async ({ path, services, detach, build, file }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("up");
      if (detach) args.push("-d");
      if (build) args.push("--build");
      if (services && services.length > 0) {
        args.push(...services);
      }

      const result = await docker(args, path);
      const data = parseComposeUpOutput(result.stdout, result.stderr, result.exitCode);

      if (result.exitCode !== 0 && data.started === 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose up failed: ${errorMsg.trim()}`);
      }

      return dualOutput(data, formatComposeUp);
    },
  );
}
