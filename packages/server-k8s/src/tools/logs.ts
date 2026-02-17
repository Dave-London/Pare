import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseLogsOutput } from "../lib/parsers.js";
import { formatLogs, compactLogsMap, formatLogsCompact } from "../lib/formatters.js";
import { KubectlLogsResultSchema } from "../schemas/index.js";

export function registerLogsTool(server: McpServer) {
  server.registerTool(
    "logs",
    {
      title: "Kubectl Logs",
      description:
        "Gets logs from a Kubernetes pod.",
      inputSchema: {
        pod: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Pod name"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        container: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Container name (for multi-container pods)"),
        tail: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Number of recent lines to show (e.g., 100)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Only return logs newer than duration (e.g., 1h, 5m, 30s)"),
        previous: z
          .boolean()
          .optional()
          .default(false)
          .describe("Get logs from previous terminated container"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: KubectlLogsResultSchema,
    },
    async ({ pod, namespace, container, tail, since, previous, compact }) => {
      assertNoFlagInjection(pod, "pod");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (container) assertNoFlagInjection(container, "container");
      if (since) assertNoFlagInjection(since, "since");

      const args = ["logs", pod];
      if (namespace) args.push("-n", namespace);
      if (container) args.push("-c", container);
      if (tail !== undefined) args.push("--tail", String(tail));
      if (since) args.push("--since", since);
      if (previous) args.push("--previous");

      const result = await run("kubectl", args, { timeout: 60_000 });
      const data = parseLogsOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        pod,
        namespace,
        container,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatLogs,
        compactLogsMap,
        formatLogsCompact,
        compact === false,
      );
    },
  );
}
