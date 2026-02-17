import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseGetOutput } from "../lib/parsers.js";
import { formatGet, compactGetMap, formatGetCompact } from "../lib/formatters.js";
import { KubectlGetResultSchema } from "../schemas/index.js";

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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: KubectlGetResultSchema,
    },
    async ({ resource, name, namespace, allNamespaces, selector, compact }) => {
      assertNoFlagInjection(resource, "resource");
      if (name) assertNoFlagInjection(name, "name");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (selector) assertNoFlagInjection(selector, "selector");

      const args = ["get", resource];
      if (name) args.push(name);
      if (allNamespaces) {
        args.push("-A");
      } else if (namespace) {
        args.push("-n", namespace);
      }
      if (selector) args.push("-l", selector);
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
