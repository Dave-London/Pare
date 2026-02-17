import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import {
  parseHelmListOutput,
  parseHelmStatusOutput,
  parseHelmInstallOutput,
  parseHelmUpgradeOutput,
} from "../lib/parsers.js";
import {
  formatHelmList,
  formatHelmStatus,
  formatHelmInstall,
  formatHelmUpgrade,
  compactHelmListMap,
  formatHelmListCompact,
  compactHelmStatusMap,
  formatHelmStatusCompact,
  compactHelmInstallMap,
  formatHelmInstallCompact,
  compactHelmUpgradeMap,
  formatHelmUpgradeCompact,
} from "../lib/formatters.js";
import {
  HelmListResultSchema,
  HelmStatusResultSchema,
  HelmInstallResultSchema,
  HelmUpgradeResultSchema,
} from "../schemas/index.js";

export function registerHelmTool(server: McpServer) {
  server.registerTool(
    "helm",
    {
      title: "Helm",
      description:
        "Manages Helm releases (install, upgrade, list, status). Returns structured JSON output.",
      inputSchema: {
        action: z.enum(["list", "status", "install", "upgrade"]).describe("Helm action to perform"),
        release: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Release name (required for status, install, upgrade)"),
        chart: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Chart reference (required for install, upgrade; e.g., bitnami/nginx)"),
        namespace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Kubernetes namespace (omit for default)"),
        setValues: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe("Values to set via --set (e.g., ['key1=val1', 'key2=val2'])"),
        values: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a values YAML file (--values)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: z.union([
        HelmListResultSchema,
        HelmStatusResultSchema,
        HelmInstallResultSchema,
        HelmUpgradeResultSchema,
      ]),
    },
    async ({ action, release, chart, namespace, setValues, values, compact }) => {
      if (release) assertNoFlagInjection(release, "release");
      if (chart) assertNoFlagInjection(chart, "chart");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (values) assertNoFlagInjection(values, "values");

      switch (action) {
        case "list": {
          const args = ["list", "-o", "json"];
          if (namespace) args.push("-n", namespace);

          const result = await run("helm", args, { timeout: 60_000 });
          const data = parseHelmListOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            namespace,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmList,
            compactHelmListMap,
            formatHelmListCompact,
            compact === false,
          );
        }

        case "status": {
          if (!release) throw new Error("release is required for status action");

          const args = ["status", release, "-o", "json"];
          if (namespace) args.push("-n", namespace);

          const result = await run("helm", args, { timeout: 60_000 });
          const data = parseHelmStatusOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            release,
            namespace,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmStatus,
            compactHelmStatusMap,
            formatHelmStatusCompact,
            compact === false,
          );
        }

        case "install": {
          if (!release) throw new Error("release is required for install action");
          if (!chart) throw new Error("chart is required for install action");

          const args = ["install", release, chart, "-o", "json"];
          if (namespace) args.push("-n", namespace);
          if (values) args.push("--values", values);
          if (setValues) {
            for (const sv of setValues) {
              assertNoFlagInjection(sv, "setValues");
              args.push("--set", sv);
            }
          }

          const result = await run("helm", args, { timeout: 120_000 });
          const data = parseHelmInstallOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            release,
            namespace,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmInstall,
            compactHelmInstallMap,
            formatHelmInstallCompact,
            compact === false,
          );
        }

        case "upgrade": {
          if (!release) throw new Error("release is required for upgrade action");
          if (!chart) throw new Error("chart is required for upgrade action");

          const args = ["upgrade", release, chart, "-o", "json"];
          if (namespace) args.push("-n", namespace);
          if (values) args.push("--values", values);
          if (setValues) {
            for (const sv of setValues) {
              assertNoFlagInjection(sv, "setValues");
              args.push("--set", sv);
            }
          }

          const result = await run("helm", args, { timeout: 120_000 });
          const data = parseHelmUpgradeOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            release,
            namespace,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmUpgrade,
            compactHelmUpgradeMap,
            formatHelmUpgradeCompact,
            compact === false,
          );
        }
      }
    },
  );
}
