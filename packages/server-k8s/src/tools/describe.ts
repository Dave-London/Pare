import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  strippedCompactDualOutput,
  run,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  pathInput,
} from "@paretools/shared";
import { parseDescribeOutput } from "../lib/parsers.js";
import {
  formatDescribe,
  schemaDescribeMap,
  compactDescribeMap,
  formatDescribeCompact,
} from "../lib/formatters.js";
import { KubectlDescribeResultSchema } from "../schemas/index.js";

/** Registers the `describe` tool on the given MCP server. */
export function registerDescribeTool(server: McpServer) {
  server.registerTool(
    "describe",
    {
      title: "Kubectl Describe",
      description: "Describes a Kubernetes resource with detailed information.",
      inputSchema: {
        resource: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Resource type (e.g., pod, service, deployment)"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Resource name (omit to describe all resources of the type)"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        selector: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Label selector for describing resources by label (-l). E.g., 'app=nginx'"),
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
        context: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes context for multi-cluster operations (--context)"),
        kubeconfig: pathInput("Path to kubeconfig file (--kubeconfig)"),
        compact: compactInput,
      },
      outputSchema: KubectlDescribeResultSchema,
    },
    async ({
      resource,
      name,
      namespace,
      selector,
      allNamespaces,
      showEvents,
      context,
      kubeconfig,
      compact,
    }) => {
      assertNoFlagInjection(resource, "resource");
      if (name) assertNoFlagInjection(name, "name");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (selector) assertNoFlagInjection(selector, "selector");
      if (context) assertNoFlagInjection(context, "context");
      if (kubeconfig) assertNoFlagInjection(kubeconfig, "kubeconfig");

      const args = ["describe", resource];
      if (name) args.push(name);
      if (allNamespaces) {
        args.push("-A");
      } else if (namespace) {
        args.push("-n", namespace);
      }
      if (selector) args.push("-l", selector);
      if (showEvents === false) {
        args.push("--show-events=false");
      }
      if (context) args.push("--context", context);
      if (kubeconfig) args.push("--kubeconfig", kubeconfig);

      const result = await run("kubectl", args, { timeout: 180_000 });
      const data = parseDescribeOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        resource,
        name ?? "",
        namespace,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return strippedCompactDualOutput(
        data,
        rawOutput,
        formatDescribe,
        schemaDescribeMap,
        compactDescribeMap,
        formatDescribeCompact,
        compact === false,
      );
    },
  );
}
