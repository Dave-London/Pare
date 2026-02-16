import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseLogsOutput } from "../lib/parsers.js";
import { formatLogs, compactLogsMap, formatLogsCompact } from "../lib/formatters.js";
import { KubectlLogsResultSchema } from "../schemas/index.js";

/** Registers the `logs` tool on the given MCP server. */
export function registerLogsTool(server: McpServer) {
  server.registerTool(
    "logs",
    {
      title: "Kubectl Logs",
      description:
        "Gets logs from a Kubernetes pod. Use instead of running `kubectl logs` in the terminal.",
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
        sinceTime: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Only return logs after a specific RFC3339 timestamp (--since-time). E.g., '2024-01-15T10:00:00Z'",
          ),
        previous: z
          .boolean()
          .optional()
          .default(false)
          .describe("Get logs from previous terminated container"),
        timestamps: z
          .boolean()
          .optional()
          .describe("Include timestamps on each line (--timestamps)"),
        allContainers: z
          .boolean()
          .optional()
          .describe("Get logs from all containers in the pod (--all-containers)"),
        limitBytes: z
          .number()
          .optional()
          .describe("Maximum bytes of logs to return (--limit-bytes)"),
        prefix: z
          .boolean()
          .optional()
          .describe("Prefix each log line with pod and container name (--prefix)"),
        selector: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Label selector for multi-pod log aggregation (-l). E.g., 'app=nginx'. When used, pod name is not required.",
          ),
        context: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes context for multi-cluster operations (--context)"),
        podRunningTimeout: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Timeout for waiting for pod to be running (--pod-running-timeout). E.g., '20s'",
          ),
        ignoreErrors: z
          .boolean()
          .optional()
          .describe("Continue on errors fetching logs from containers (--ignore-errors)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: KubectlLogsResultSchema,
    },
    async ({
      pod,
      namespace,
      container,
      tail,
      since,
      sinceTime,
      previous,
      timestamps,
      allContainers,
      limitBytes,
      prefix,
      selector,
      context,
      podRunningTimeout,
      ignoreErrors,
      compact,
    }) => {
      assertNoFlagInjection(pod, "pod");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (container) assertNoFlagInjection(container, "container");
      if (since) assertNoFlagInjection(since, "since");
      if (sinceTime) assertNoFlagInjection(sinceTime, "sinceTime");
      if (selector) assertNoFlagInjection(selector, "selector");
      if (context) assertNoFlagInjection(context, "context");
      if (podRunningTimeout) assertNoFlagInjection(podRunningTimeout, "podRunningTimeout");

      const args = ["logs", pod];
      if (namespace) args.push("-n", namespace);
      if (container) args.push("-c", container);
      if (tail !== undefined) args.push("--tail", String(tail));
      if (since) args.push("--since", since);
      if (sinceTime) args.push("--since-time", sinceTime);
      if (previous) args.push("--previous");
      if (timestamps) args.push("--timestamps");
      if (allContainers) args.push("--all-containers");
      if (limitBytes !== undefined) args.push("--limit-bytes", String(limitBytes));
      if (prefix) args.push("--prefix");
      if (selector) args.push("-l", selector);
      if (context) args.push("--context", context);
      if (podRunningTimeout) args.push("--pod-running-timeout", podRunningTimeout);
      if (ignoreErrors) args.push("--ignore-errors");

      const result = await run("kubectl", args, { timeout: 180_000 });
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
