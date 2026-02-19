import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseLogsOutput } from "../lib/parsers.js";
import { formatLogs, compactLogsMap, formatLogsCompact } from "../lib/formatters.js";
import { DockerLogsSchema } from "../schemas/index.js";

/** Registers the `logs` tool on the given MCP server. */
export function registerLogsTool(server: McpServer) {
  server.registerTool(
    "logs",
    {
      title: "Docker Logs",
      description: "Retrieves container logs as structured line arrays.",
      inputSchema: {
        container: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Container name or ID"),
        tail: z
          .number()
          .optional()
          .default(100)
          .describe(
            "Number of lines to fetch from Docker (passed to --tail). " +
              "This controls how many lines Docker returns from the end of the log. Default: 100.",
          ),
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
            "Show logs until timestamp (e.g., '5m', '2024-01-02') for time-bounded queries",
          ),
        /** #114: Clarified - 'limit' truncates the structured output AFTER Docker returns lines.
         *  Use 'tail' to control how many lines Docker returns, and 'limit' to cap the structured response. */
        limit: z
          .number()
          .optional()
          .describe(
            "Max lines in structured output. Truncates AFTER Docker returns lines (sets isTruncated=true). " +
              "Use 'tail' to limit what Docker returns; use 'limit' to cap the structured response size.",
          ),
        timestamps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show timestamps for each log line (default: false)"),
        details: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show extra details provided to logs (default: false)"),
        compact: compactInput,
      },
      outputSchema: DockerLogsSchema,
    },
    async ({ container, tail, since, until, limit, timestamps, details, compact }) => {
      assertNoFlagInjection(container, "container");
      if (since) assertNoFlagInjection(since, "since");
      if (until) assertNoFlagInjection(until, "until");

      const args = ["logs", container, "--tail", String(tail ?? 100)];
      if (since) args.push("--since", since);
      if (until) args.push("--until", until);
      if (timestamps) args.push("--timestamps");
      if (details) args.push("--details");

      const result = await docker(args);
      // #113: Capture stdout and stderr separately
      const combinedOutput = result.stdout || result.stderr;
      const data = parseLogsOutput(combinedOutput, container, limit, result.stderr);
      return compactDualOutput(
        data,
        combinedOutput,
        formatLogs,
        compactLogsMap,
        formatLogsCompact,
        compact === false,
      );
    },
  );
}
