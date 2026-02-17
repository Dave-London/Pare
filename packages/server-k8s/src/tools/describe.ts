import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseDescribeOutput } from "../lib/parsers.js";
import { formatDescribe, compactDescribeMap, formatDescribeCompact } from "../lib/formatters.js";
import { KubectlDescribeResultSchema } from "../schemas/index.js";

export function registerDescribeTool(server: McpServer) {
  server.registerTool(
    "describe",
    {
      title: "Kubectl Describe",
      description:
        "Describes a Kubernetes resource with detailed information.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: KubectlDescribeResultSchema,
    },
    async ({ resource, name, namespace, compact }) => {
      assertNoFlagInjection(resource, "resource");
      assertNoFlagInjection(name, "name");
      if (namespace) assertNoFlagInjection(namespace, "namespace");

      const args = ["describe", resource, name];
      if (namespace) args.push("-n", namespace);

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
