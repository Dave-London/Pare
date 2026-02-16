import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeLogsOutput } from "../lib/parsers.js";
import {
  formatComposeLogs,
  compactComposeLogsMap,
  formatComposeLogsCompact,
} from "../lib/formatters.js";
import { DockerComposeLogsSchema } from "../schemas/index.js";

/** Registers the `compose-logs` tool on the given MCP server. */
export function registerComposeLogsTool(server: McpServer) {
  server.registerTool(
    "compose-logs",
    {
      title: "Docker Compose Logs",
      description:
        "Retrieves Docker Compose service logs as structured entries. Use instead of running `docker compose logs` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory containing docker-compose.yml"),
        services: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Specific services to get logs for (default: all)"),
        tail: z
          .number()
          .optional()
          .describe("Number of lines to return per service (passed to --tail)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Show logs since timestamp (e.g., '10m', '2024-01-01')"),
        timestamps: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include timestamps in output (default: true)"),
        index: z
          .number()
          .optional()
          .describe("Target a specific replica index of a scaled service"),
        noLogPrefix: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not prefix log lines with service name (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerComposeLogsSchema,
    },
    async ({ path, services, tail, since, timestamps, index, noLogPrefix, compact }) => {
      if (since) assertNoFlagInjection(since, "since");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }

      const args = ["compose", "logs", "--no-color"];
      if (timestamps) args.push("--timestamps");
      if (tail != null) args.push("--tail", String(tail));
      if (since) args.push("--since", since);
      if (index != null) args.push("--index", String(index));
      if (noLogPrefix) args.push("--no-log-prefix");
      if (services && services.length > 0) {
        args.push(...services);
      }

      const result = await docker(args, path);
      const output = result.stdout || result.stderr;

      if (result.exitCode !== 0 && !output.trim()) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose logs failed: ${errorMsg.trim()}`);
      }

      const data = parseComposeLogsOutput(output);

      return compactDualOutput(
        data,
        output,
        formatComposeLogs,
        compactComposeLogsMap,
        formatComposeLogsCompact,
        compact === false,
      );
    },
  );
}
