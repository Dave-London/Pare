import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
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
      description: "Retrieves Docker Compose service logs as structured entries.",
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
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Compose file path for consistency with other compose tools (maps to -f)"),
        tail: z
          .number()
          .optional()
          .describe("Number of lines to return per service (passed to --tail)"),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .default(1000)
          .describe("Maximum number of parsed log entries returned in structured output"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Show logs since timestamp (e.g., '10m', '2024-01-01')"),
        until: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Show logs until timestamp (e.g., '5m', '2024-01-02') for time-windowed queries",
          ),
        timestamps: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include timestamps in output (default: true)"),
        /** #102: Add follow param for bounded log streaming with -f flag. */
        follow: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Follow log output (-f). Must be used with 'tail' to provide bounded streaming. " +
              "WARNING: Without tail, this may produce unbounded output (default: false)",
          ),
        index: z
          .number()
          .optional()
          .describe("Target a specific replica index of a scaled service"),
        noLogPrefix: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not prefix log lines with service name (default: false)"),
        compact: compactInput,
      },
      outputSchema: DockerComposeLogsSchema,
    },
    async ({
      path,
      services,
      file,
      tail,
      limit,
      since,
      until,
      timestamps,
      follow,
      index,
      noLogPrefix,
      compact,
    }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (since) assertNoFlagInjection(since, "since");
      if (until) assertNoFlagInjection(until, "until");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("logs", "--no-color");
      if (timestamps) args.push("--timestamps");
      if (tail != null) args.push("--tail", String(tail));
      if (since) args.push("--since", since);
      if (until) args.push("--until", until);
      // #102: Add follow flag for bounded streaming
      if (follow) args.push("-f");
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

      const data = parseComposeLogsOutput(output, limit);

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
