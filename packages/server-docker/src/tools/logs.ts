import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseLogsOutput } from "../lib/parsers.js";
import { formatLogs, compactLogsMap, formatLogsCompact } from "../lib/formatters.js";
import { DockerLogsSchema } from "../schemas/index.js";

export function registerLogsTool(server: McpServer) {
  server.registerTool(
    "logs",
    {
      title: "Docker Logs",
      description:
        "Retrieves container logs as structured line arrays.",
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
        limit: z
          .number()
          .optional()
          .default(100)
          .describe(
            "Max lines in structured output (default: 100). Lines beyond this are truncated with isTruncated flag.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerLogsSchema,
    },
    async ({ container, tail, since, limit, compact }) => {
      assertNoFlagInjection(container, "container");
      if (since) assertNoFlagInjection(since, "since");

      const args = ["logs", container, "--tail", String(tail ?? 100)];
      if (since) args.push("--since", since);

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
