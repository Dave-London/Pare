import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseLogsOutput } from "../lib/parsers.js";
import { formatLogs } from "../lib/formatters.js";
import { DockerLogsSchema } from "../schemas/index.js";

export function registerLogsTool(server: McpServer) {
  server.registerTool(
    "logs",
    {
      title: "Docker Logs",
      description:
        "Retrieves container logs as structured line arrays. Use instead of running `docker logs` in the terminal.",
      inputSchema: {
        container: z.string().describe("Container name or ID"),
        tail: z
          .number()
          .optional()
          .default(100)
          .describe("Number of lines to return (default: 100)"),
        since: z
          .string()
          .optional()
          .describe("Show logs since timestamp (e.g., '10m', '2024-01-01')"),
      },
      outputSchema: DockerLogsSchema,
    },
    async ({ container, tail, since }) => {
      assertNoFlagInjection(container, "container");
      if (since) assertNoFlagInjection(since, "since");

      const args = ["logs", container, "--tail", String(tail ?? 100)];
      if (since) args.push("--since", since);

      const result = await docker(args);
      const output = result.stdout || result.stderr;
      const data = parseLogsOutput(output, container);
      return dualOutput(data, formatLogs);
    },
  );
}
