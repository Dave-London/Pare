import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseGetOutput } from "../lib/parsers.js";
import { formatGet, compactGetMap, formatGetCompact } from "../lib/formatters.js";
import { KubectlGetResultSchema } from "../schemas/index.js";

/** Registers the `get` tool on the given MCP server. */
export function registerGetTool(server: McpServer) {
  server.registerTool(
    "get",
    {
      title: "Kubectl Get",
      description:
        "Gets Kubernetes resources and returns structured JSON output. Use instead of running `kubectl get` in the terminal.",
      inputSchema: {
        resource: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Resource type (e.g., pods, services, deployments, nodes)"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Resource name (omit to list all)"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        allNamespaces: z
          .boolean()
          .optional()
          .default(false)
          .describe("Get resources from all namespaces (-A)"),
        selector: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Label selector (e.g., app=nginx)"),
        fieldSelector: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Field selector for filtering by resource fields (--field-selector). E.g., 'status.phase=Running'",
          ),
        context: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes context for multi-cluster operations (--context)"),
        kubeconfig: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to kubeconfig file (--kubeconfig)"),
        sortBy: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "JSONPath expression for sorting results (--sort-by). E.g., '.metadata.creationTimestamp'",
          ),
        ignoreNotFound: z
          .boolean()
          .optional()
          .describe("Suppress not-found errors instead of failing (--ignore-not-found)"),
        chunkSize: z
          .number()
          .optional()
          .describe("Number of results to return per request for pagination (--chunk-size)"),
        filename: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .optional()
          .describe(
            "Identify resources from file paths (-f). Use to get resources defined in manifest files.",
          ),
        subresource: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Subresource to access (--subresource). E.g., 'status' or 'scale' for status/scale subresource.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: KubectlGetResultSchema,
    },
    async ({
      resource,
      name,
      namespace,
      allNamespaces,
      selector,
      fieldSelector,
      context,
      kubeconfig,
      sortBy,
      ignoreNotFound,
      chunkSize,
      filename,
      subresource,
      compact,
    }) => {
      assertNoFlagInjection(resource, "resource");
      if (name) assertNoFlagInjection(name, "name");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (selector) assertNoFlagInjection(selector, "selector");
      if (fieldSelector) assertNoFlagInjection(fieldSelector, "fieldSelector");
      if (context) assertNoFlagInjection(context, "context");
      if (kubeconfig) assertNoFlagInjection(kubeconfig, "kubeconfig");
      if (sortBy) assertNoFlagInjection(sortBy, "sortBy");
      if (subresource) assertNoFlagInjection(subresource, "subresource");
      if (filename) {
        for (const f of filename) {
          assertNoFlagInjection(f, "filename");
        }
      }

      const args = ["get", resource];
      if (name) args.push(name);
      if (allNamespaces) {
        args.push("-A");
      } else if (namespace) {
        args.push("-n", namespace);
      }
      if (selector) args.push("-l", selector);
      if (fieldSelector) args.push("--field-selector", fieldSelector);
      if (context) args.push("--context", context);
      if (kubeconfig) args.push("--kubeconfig", kubeconfig);
      if (sortBy) args.push("--sort-by", sortBy);
      if (ignoreNotFound) args.push("--ignore-not-found");
      if (chunkSize !== undefined) args.push("--chunk-size", String(chunkSize));
      if (filename) {
        for (const f of filename) {
          args.push("-f", f);
        }
      }
      if (subresource) args.push("--subresource", subresource);
      args.push("-o", "json");

      const result = await run("kubectl", args, { timeout: 60_000 });
      const data = parseGetOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        resource,
        namespace,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatGet,
        compactGetMap,
        formatGetCompact,
        compact === false,
      );
    },
  );
}
