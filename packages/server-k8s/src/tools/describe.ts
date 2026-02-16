import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseDescribeOutput } from "../lib/parsers.js";
import { formatDescribe, compactDescribeMap, formatDescribeCompact } from "../lib/formatters.js";
import { KubectlDescribeResultSchema } from "../schemas/index.js";

/** Registers the `describe` tool on the given MCP server. */
export function registerDescribeTool(server: McpServer) {
  server.registerTool(
    "describe",
    {
      title: "Kubectl Describe",
      description:
        "Describes a Kubernetes resource with detailed information. Use instead of running `kubectl describe` in the terminal.",
      inputSchema: {
        resource: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Resource type (e.g., pod, service, deployment)"),
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Resource name"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        allNamespaces: z
          .boolean()
          .optional()
          .describe("Describe resources across all namespaces (-A)"),
        showEvents: z
          .boolean()
          .optional()
          .describe(
            "Show events in describe output (default: true). Set false to hide events (--show-events=false)",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: KubectlDescribeResultSchema,
    },
    async ({ resource, name, namespace, allNamespaces, showEvents, compact }) => {
      assertNoFlagInjection(resource, "resource");
      assertNoFlagInjection(name, "name");
      if (namespace) assertNoFlagInjection(namespace, "namespace");

      const args = ["describe", resource, name];
      if (allNamespaces) {
        args.push("-A");
      } else if (namespace) {
        args.push("-n", namespace);
      }
      if (showEvents === false) {
        args.push("--show-events=false");
      }

      const result = await run("kubectl", args, { timeout: 60_000 });
      const data = parseDescribeOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        resource,
        name,
        namespace,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatDescribe,
        compactDescribeMap,
        formatDescribeCompact,
        compact === false,
      );
    },
  );
}
