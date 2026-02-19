import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import {
  parseHelmListOutput,
  parseHelmStatusOutput,
  parseHelmInstallOutput,
  parseHelmUpgradeOutput,
  parseHelmUninstallOutput,
  parseHelmRollbackOutput,
  parseHelmHistoryOutput,
  parseHelmTemplateOutput,
} from "../lib/parsers.js";
import {
  formatHelmList,
  formatHelmStatus,
  formatHelmInstall,
  formatHelmUpgrade,
  formatHelmUninstall,
  formatHelmRollback,
  formatHelmHistory,
  formatHelmTemplate,
  compactHelmListMap,
  formatHelmListCompact,
  compactHelmStatusMap,
  formatHelmStatusCompact,
  compactHelmInstallMap,
  formatHelmInstallCompact,
  compactHelmUpgradeMap,
  formatHelmUpgradeCompact,
  compactHelmUninstallMap,
  formatHelmUninstallCompact,
  compactHelmRollbackMap,
  formatHelmRollbackCompact,
  compactHelmHistoryMap,
  formatHelmHistoryCompact,
  compactHelmTemplateMap,
  formatHelmTemplateCompact,
} from "../lib/formatters.js";
import {
  HelmListResultSchema,
  HelmStatusResultSchema,
  HelmInstallResultSchema,
  HelmUpgradeResultSchema,
  HelmUninstallResultSchema,
  HelmRollbackResultSchema,
  HelmHistoryResultSchema,
  HelmTemplateResultSchema,
} from "../schemas/index.js";

/** Registers the `helm` tool on the given MCP server. */
export function registerHelmTool(server: McpServer) {
  server.registerTool(
    "helm",
    {
      title: "Helm",
      description:
        "Manages Helm releases (install, upgrade, list, status, history, template). Returns structured JSON output.",
      inputSchema: {
        action: z
          .enum([
            "list",
            "status",
            "install",
            "upgrade",
            "uninstall",
            "rollback",
            "history",
            "template",
          ])
          .describe("Helm action to perform"),
        release: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Release name (required for status, install, upgrade, history, template)"),
        chart: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Chart reference (required for install, upgrade, template; e.g., bitnami/nginx)",
          ),
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
          .union([
            z.string().max(INPUT_LIMITS.PATH_MAX),
            z.array(z.string().max(INPUT_LIMITS.PATH_MAX)),
          ])
          .optional()
          .describe(
            "Path(s) to values YAML file(s) (--values). Accepts a single path or an array of paths.",
          ),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Chart version to install/upgrade (--version). For reproducible pinned versions.",
          ),
        dryRun: z
          .boolean()
          .optional()
          .describe("Simulate install/upgrade without making changes (--dry-run)"),
        keepHistory: z
          .boolean()
          .optional()
          .describe("Keep release history after uninstall (--keep-history, uninstall action only)"),
        revision: z
          .number()
          .optional()
          .describe("Revision number to rollback to (rollback action only)"),
        wait: z
          .boolean()
          .optional()
          .describe("Wait until resources are ready after install/upgrade/rollback (--wait)"),
        waitTimeout: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Timeout for --wait (--timeout). E.g., '5m0s'. Only effective when wait is true.",
          ),
        atomic: z
          .boolean()
          .optional()
          .describe("Roll back on failure during install/upgrade (--atomic)"),
        createNamespace: z
          .boolean()
          .optional()
          .describe("Create namespace if it doesn't exist (--create-namespace)"),
        installOnUpgrade: z
          .boolean()
          .optional()
          .describe("Install the release if it doesn't exist during upgrade (--install)"),
        reuseValues: z
          .boolean()
          .optional()
          .describe("Reuse existing values on upgrade (--reuse-values)"),
        allNamespaces: z
          .boolean()
          .optional()
          .describe("List releases across all namespaces (-A, list action only)"),
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Regex filter for release names in list action (--filter)"),
        showResources: z
          .boolean()
          .optional()
          .describe("Show resources in status output (--show-resources, status action only)"),
        statusRevision: z
          .number()
          .optional()
          .describe(
            "Show status for a specific historical revision (--revision, status action only)",
          ),
        repo: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Chart repository URL (--repo). For installing from a specific repo."),
        description: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Custom description for the release (--description). Added to the release metadata.",
          ),
        noHooks: z.boolean().optional().describe("Skip execution of hooks (--no-hooks)"),
        skipCrds: z.boolean().optional().describe("Skip CRD installation (--skip-crds)"),
        compact: compactInput,
      },
      outputSchema: z.union([
        HelmListResultSchema,
        HelmStatusResultSchema,
        HelmInstallResultSchema,
        HelmUpgradeResultSchema,
        HelmUninstallResultSchema,
        HelmRollbackResultSchema,
        HelmHistoryResultSchema,
        HelmTemplateResultSchema,
      ]),
    },
    async ({
      action,
      release,
      chart,
      namespace,
      setValues,
      values,
      version,
      dryRun,
      keepHistory,
      revision,
      wait,
      waitTimeout,
      atomic,
      createNamespace,
      installOnUpgrade,
      reuseValues,
      allNamespaces,
      filter,
      showResources,
      statusRevision,
      repo,
      description,
      noHooks,
      skipCrds,
      compact,
    }) => {
      if (release) assertNoFlagInjection(release, "release");
      if (chart) assertNoFlagInjection(chart, "chart");
      if (namespace) assertNoFlagInjection(namespace, "namespace");
      if (version) assertNoFlagInjection(version, "version");
      if (filter) assertNoFlagInjection(filter, "filter");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (description) assertNoFlagInjection(description, "description");
      if (waitTimeout) assertNoFlagInjection(waitTimeout, "waitTimeout");

      // Normalize values to array
      const valuesFiles = values ? (Array.isArray(values) ? values : [values]) : [];
      for (const v of valuesFiles) {
        assertNoFlagInjection(v, "values");
      }

      switch (action) {
        case "list": {
          const args = ["list", "-o", "json"];
          if (allNamespaces) {
            args.push("-A");
          } else if (namespace) {
            args.push("-n", namespace);
          }
          if (filter) args.push("--filter", filter);

          const result = await run("helm", args, { timeout: 180_000 });
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
          if (showResources) args.push("--show-resources");
          if (statusRevision !== undefined) args.push("--revision", String(statusRevision));

          const result = await run("helm", args, { timeout: 180_000 });
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
          if (version) args.push("--version", version);
          for (const v of valuesFiles) {
            args.push("--values", v);
          }
          if (setValues) {
            for (const sv of setValues) {
              assertNoFlagInjection(sv, "setValues");
              args.push("--set", sv);
            }
          }
          if (dryRun) args.push("--dry-run");
          if (wait) args.push("--wait");
          if (waitTimeout) args.push("--timeout", waitTimeout);
          if (atomic) args.push("--atomic");
          if (createNamespace) args.push("--create-namespace");
          if (repo) args.push("--repo", repo);
          if (description) args.push("--description", description);
          if (noHooks) args.push("--no-hooks");
          if (skipCrds) args.push("--skip-crds");

          const result = await run("helm", args, { timeout: 180_000 });
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
          if (version) args.push("--version", version);
          for (const v of valuesFiles) {
            args.push("--values", v);
          }
          if (setValues) {
            for (const sv of setValues) {
              assertNoFlagInjection(sv, "setValues");
              args.push("--set", sv);
            }
          }
          if (dryRun) args.push("--dry-run");
          if (wait) args.push("--wait");
          if (waitTimeout) args.push("--timeout", waitTimeout);
          if (atomic) args.push("--atomic");
          if (createNamespace) args.push("--create-namespace");
          if (installOnUpgrade) args.push("--install");
          if (reuseValues) args.push("--reuse-values");
          if (repo) args.push("--repo", repo);
          if (description) args.push("--description", description);
          if (noHooks) args.push("--no-hooks");
          if (skipCrds) args.push("--skip-crds");

          const result = await run("helm", args, { timeout: 180_000 });
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

        case "uninstall": {
          if (!release) throw new Error("release is required for uninstall action");

          const args = ["uninstall", release];
          if (namespace) args.push("-n", namespace);
          if (keepHistory) args.push("--keep-history");
          if (dryRun) args.push("--dry-run");
          if (noHooks) args.push("--no-hooks");
          if (description) args.push("--description", description);

          const result = await run("helm", args, { timeout: 180_000 });
          const data = parseHelmUninstallOutput(
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
            formatHelmUninstall,
            compactHelmUninstallMap,
            formatHelmUninstallCompact,
            compact === false,
          );
        }

        case "rollback": {
          if (!release) throw new Error("release is required for rollback action");

          const args = ["rollback", release];
          if (revision !== undefined) args.push(String(revision));
          if (namespace) args.push("-n", namespace);
          if (wait) args.push("--wait");
          if (waitTimeout) args.push("--timeout", waitTimeout);
          if (noHooks) args.push("--no-hooks");

          const result = await run("helm", args, { timeout: 180_000 });
          const data = parseHelmRollbackOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            release,
            revision,
            namespace,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmRollback,
            compactHelmRollbackMap,
            formatHelmRollbackCompact,
            compact === false,
          );
        }

        case "history": {
          if (!release) throw new Error("release is required for history action");

          const args = ["history", release, "-o", "json"];
          if (namespace) args.push("-n", namespace);

          const result = await run("helm", args, { timeout: 180_000 });
          const data = parseHelmHistoryOutput(
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
            formatHelmHistory,
            compactHelmHistoryMap,
            formatHelmHistoryCompact,
            compact === false,
          );
        }

        case "template": {
          if (!release) throw new Error("release is required for template action");
          if (!chart) throw new Error("chart is required for template action");

          const args = ["template", release, chart];
          if (namespace) args.push("-n", namespace);
          for (const v of valuesFiles) {
            args.push("--values", v);
          }
          if (setValues) {
            for (const sv of setValues) {
              assertNoFlagInjection(sv, "setValues");
              args.push("--set", sv);
            }
          }
          if (version) args.push("--version", version);
          if (repo) args.push("--repo", repo);
          if (noHooks) args.push("--no-hooks");
          if (skipCrds) args.push("--skip-crds");

          const result = await run("helm", args, { timeout: 180_000 });
          const data = parseHelmTemplateOutput(result.stdout, result.stderr, result.exitCode);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();

          return compactDualOutput(
            data,
            rawOutput,
            formatHelmTemplate,
            compactHelmTemplateMap,
            formatHelmTemplateCompact,
            compact === false,
          );
        }
      }
    },
  );
}
