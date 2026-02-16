import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposePsJson } from "../lib/parsers.js";
import { formatComposePs, compactComposePsMap, formatComposePsCompact } from "../lib/formatters.js";
import { DockerComposePsSchema } from "../schemas/index.js";

/** Registers the `compose-ps` tool on the given MCP server. */
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
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Compose file path for consistency with compose-up/compose-down (maps to -f)"),
        services: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Filter to specific services (positional args)"),
        status: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Filter by container status (e.g., ["running", "exited"])'),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Generic property filter (--filter)"),
        all: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show stopped containers from docker compose run (default: false)"),
        noTrunc: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not truncate output (default: false)"),
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
    async ({ path, file, services, status, filter, all, noTrunc, compact }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (filter) assertNoFlagInjection(filter, "filter");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }
      if (status) {
        for (const st of status) {
          assertNoFlagInjection(st, "status");
        }
      }

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("ps", "--format", "json");
      if (all) args.push("--all");
      if (noTrunc) args.push("--no-trunc");
      for (const st of status ?? []) {
        args.push("--status", st);
      }
      if (filter) args.push("--filter", filter);
      if (services && services.length > 0) {
        args.push(...services);
      }
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
