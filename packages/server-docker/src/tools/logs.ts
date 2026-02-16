import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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
      description:
        "Retrieves container logs as structured line arrays. Use instead of running `docker logs` in the terminal.",
      inputSchema: {
        container: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Container name or ID"),
        tail: z
          .number()
          .optional()
          .default(100)
          .describe("Number of lines to return (default: 100)"),
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
        limit: z
          .number()
          .optional()
          .default(100)
          .describe(
            "Max lines in structured output (default: 100). Lines beyond this are truncated with isTruncated flag.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
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
      const output = result.stdout || result.stderr;
      const data = parseLogsOutput(output, container, limit);
      return compactDualOutput(
        data,
        output,
        formatLogs,
        compactLogsMap,
        formatLogsCompact,
        compact === false,
      );
    },
  );
}
