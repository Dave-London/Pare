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
        file: z
          .union([
            z.string().max(INPUT_LIMITS.PATH_MAX),
            z.array(z.string().max(INPUT_LIMITS.PATH_MAX)),
          ])
          .describe("Path to the manifest file(s) to apply. Accepts a single path or an array."),
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
        validate: z
          .enum(["true", "false", "strict"])
          .optional()
          .describe(
            "Validation mode: 'true' (default kubectl validation), 'false' (skip validation), 'strict' (fail on unknown fields)",
          ),
        serverSide: z
          .boolean()
          .optional()
          .describe("Use server-side apply with conflict detection (--server-side)"),
        wait: z
          .boolean()
          .optional()
          .describe("Wait until resources are ready after applying (--wait)"),
        waitTimeout: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Timeout for --wait (--timeout). E.g., '30s', '5m', '1h'. Only effective when wait is true.",
          ),
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
        fieldManager: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Field manager name for server-side apply (--field-manager). Required for server-side apply.",
          ),
        context: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes context for multi-cluster operations (--context)"),
        selector: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Label selector to filter resources (-l)"),
        cascade: z
          .enum(["background", "orphan", "foreground"])
          .optional()
          .describe(
            "Cascade mode for deletion of dependents: 'background' (default), 'orphan', or 'foreground'",
          ),
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
      validate,
      serverSide,
      wait,
      waitTimeout,
      recursive,
      kustomize,
      prune,
      force,
      forceConflicts,
      fieldManager,
      context,
      selector,
      cascade,
      compact,
    }) => {
      // Normalize file to array
      const files = Array.isArray(file) ? file : [file];
      for (const f of files) {
        assertNoFlagInjection(f, "file");
      }
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (fieldManager) assertNoFlagInjection(fieldManager, "fieldManager");
      if (context) assertNoFlagInjection(context, "context");
      if (selector) assertNoFlagInjection(selector, "selector");
      if (waitTimeout) assertNoFlagInjection(waitTimeout, "waitTimeout");

      const args = ["apply"];
      // Add file arguments
      const fileFlag = kustomize ? "-k" : "-f";
      for (const f of files) {
        args.push(fileFlag, f);
      }
      if (namespace) {
        args.push("-n", namespace);
      }
      if (dryRun && dryRun !== "none") {
        args.push("--dry-run", dryRun);
      }
      if (validate) {
        args.push(`--validate=${validate}`);
      }
      if (serverSide) {
        args.push("--server-side");
      }
      if (wait) {
        args.push("--wait");
      }
      if (waitTimeout) {
        args.push("--timeout", waitTimeout);
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
      if (fieldManager) {
        args.push("--field-manager", fieldManager);
      }
      if (context) {
        args.push("--context", context);
      }
      if (selector) {
        args.push("-l", selector);
      }
      if (cascade) {
        args.push("--cascade", cascade);
      }
      args.push("-o", "json");

      const result = await run("kubectl", args, { timeout: 180_000 });
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
