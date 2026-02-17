import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeDownOutput } from "../lib/parsers.js";
import {
  formatComposeDown,
  compactComposeDownMap,
  formatComposeDownCompact,
} from "../lib/formatters.js";
import { DockerComposeDownSchema } from "../schemas/index.js";

/** Registers the `compose-down` tool on the given MCP server. */
export function registerComposeDownTool(server: McpServer) {
  server.registerTool(
    "compose-down",
    {
      title: "Docker Compose Down",
      description:
        "Stops Docker Compose services and returns structured status. Use instead of running `docker compose down` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .describe("Directory containing docker-compose.yml"),
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
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Compose file path (default: docker-compose.yml)"),
        rmi: z
          .enum(["all", "local"])
          .optional()
          .describe('Remove images: "all" removes all, "local" removes only untagged images'),
        services: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Specific services to tear down (default: all)"),
        timeout: z
          .number()
          .optional()
          .describe("Timeout in seconds for graceful shutdown of services"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run in dry-run mode without actually stopping services (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerComposeDownSchema,
    },
    async ({ path, volumes, removeOrphans, file, rmi, services, timeout, dryRun, compact }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("down");
      if (volumes) args.push("--volumes");
      if (removeOrphans) args.push("--remove-orphans");
      if (rmi) args.push("--rmi", rmi);
      if (timeout != null) args.push("--timeout", String(timeout));
      if (dryRun) args.push("--dry-run");
      if (services && services.length > 0) {
        args.push(...services);
      }

      const result = await docker(args, path);
      const data = parseComposeDownOutput(result.stdout, result.stderr, result.exitCode, {
        trackVolumes: !!volumes,
        trackNetworks: true,
      });

      if (result.exitCode !== 0 && data.stopped === 0 && data.removed === 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose down failed: ${errorMsg.trim()}`);
      }

      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatComposeDown,
        compactComposeDownMap,
        formatComposeDownCompact,
        compact === false,
      );
    },
  );
}
