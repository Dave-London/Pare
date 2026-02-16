import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseApplyOutput } from "../lib/parsers.js";
import { formatApply, compactApplyMap, formatApplyCompact } from "../lib/formatters.js";
import { KubectlApplyResultSchema } from "../schemas/index.js";

/** Registers the `apply` tool on the given MCP server. */
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
        serverSide: z
          .boolean()
          .optional()
          .describe("Use server-side apply with conflict detection (--server-side)"),
        wait: z
          .boolean()
          .optional()
          .describe("Wait until resources are ready after applying (--wait)"),
        recursive: z.boolean().optional().describe("Process directories recursively (-R)"),
        kustomize: z
          .boolean()
          .optional()
          .describe("Apply a kustomization directory (-k instead of -f)"),
        prune: z
          .boolean()
          .optional()
          .describe("Prune resources not in the manifest for GitOps workflows (--prune)"),
        force: z.boolean().optional().describe("Force resource recreation if needed (--force)"),
        forceConflicts: z
          .boolean()
          .optional()
          .describe("Force apply even with field ownership conflicts (--force-conflicts)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: KubectlApplyResultSchema,
    },
    async ({
      file,
      namespace,
      dryRun,
      serverSide,
      wait,
      recursive,
      kustomize,
      prune,
      force,
      forceConflicts,
      compact,
    }) => {
      assertNoFlagInjection(file, "file");
      const args = ["apply", kustomize ? "-k" : "-f", file];
      if (namespace) {
        assertNoFlagInjection(namespace, "namespace");
        args.push("-n", namespace);
      }
      if (dryRun && dryRun !== "none") {
        args.push("--dry-run", dryRun);
      }
      if (serverSide) {
        args.push("--server-side");
      }
      if (wait) {
        args.push("--wait");
      }
      if (recursive) {
        args.push("-R");
      }
      if (prune) {
        args.push("--prune");
      }
      if (force) {
        args.push("--force");
      }
      if (forceConflicts) {
        args.push("--force-conflicts");
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
