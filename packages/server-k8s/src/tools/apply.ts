import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseApplyOutput } from "../lib/parsers.js";
import { formatApply, compactApplyMap, formatApplyCompact } from "../lib/formatters.js";
import { KubectlApplyResultSchema } from "../schemas/index.js";

export function registerApplyTool(server: McpServer) {
  server.registerTool(
    "apply",
    {
      title: "Kubectl Apply",
      description:
        "Applies a Kubernetes manifest file. Use instead of running `kubectl apply` in the terminal.",
      inputSchema: {
        file: z.string().max(INPUT_LIMITS.PATH_MAX).describe("Path to the manifest file to apply"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        dryRun: z
          .enum(["none", "client", "server"])
          .optional()
          .default("none")
          .describe("Dry run mode: none, client, or server"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: KubectlApplyResultSchema,
    },
    async ({ file, namespace, dryRun, compact }) => {
      const args = ["apply", "-f", file];
      if (namespace) {
        assertNoFlagInjection(namespace, "namespace");
        args.push("-n", namespace);
      }
      if (dryRun && dryRun !== "none") {
        args.push("--dry-run", dryRun);
      }
      args.push("-o", "json");

      const result = await run("kubectl", args, { timeout: 60_000 });
      const data = parseApplyOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatApply,
        compactApplyMap,
        formatApplyCompact,
        compact === false,
      );
    },
  );
}
