import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  INPUT_LIMITS,
  assertNoFlagInjection,
  assertAllowedRoot,
  cwdPathInput,
  compactInput,
} from "@paretools/shared";
import { parseSemgrepJson } from "../lib/parsers.js";
import {
  formatSemgrepScan,
  compactSemgrepScanMap,
  formatSemgrepScanCompact,
} from "../lib/formatters.js";
import { SemgrepScanResultSchema } from "../schemas/index.js";

/** Registers the `semgrep` tool on the given MCP server. */
export function registerSemgrepTool(server: McpServer) {
  server.registerTool(
    "semgrep",
    {
      title: "Semgrep Static Analysis",
      description:
        "Runs Semgrep static analysis with structured rules and findings. Returns structured finding data with severity summary.",
      inputSchema: {
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns or paths to scan (default: ['.'])"),
        config: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .default("auto")
          .describe(
            'Semgrep config/ruleset(s). String or string[] for multiple configs (e.g., "auto", "p/security-audit", ["p/owasp-top-ten", "p/cwe-top-25"]). Default: "auto"',
          ),
        severity: z
          .enum(["INFO", "WARNING", "ERROR"])
          .optional()
          .describe("Severity filter. Default: all severities"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Glob patterns to exclude from scanning (--exclude)"),
        include: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Glob patterns to include in scanning (--include)"),
        excludeRule: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Rule IDs to suppress (--exclude-rule, for known false positives)"),
        baselineCommit: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Baseline commit for differential scanning in PR workflows (--baseline-commit)",
          ),
        dataflowTraces: z
          .boolean()
          .optional()
          .describe("Include dataflow traces for taint analysis findings (--dataflow-traces)"),
        autofix: z.boolean().optional().describe("Automatically apply suggested fixes (--autofix)"),
        dryrun: z
          .boolean()
          .optional()
          .describe("Preview autofix changes without applying them (--dryrun)"),
        maxTargetBytes: z
          .number()
          .optional()
          .describe("Maximum file size in bytes to scan, skip larger files (--max-target-bytes)"),
        jobs: z.number().optional().describe("Number of parallel jobs for scanning (--jobs)"),
        path: cwdPathInput,
        compact: compactInput,
      },
      outputSchema: SemgrepScanResultSchema,
    },
    async ({
      patterns,
      config,
      severity,
      exclude,
      include,
      excludeRule,
      baselineCommit,
      dataflowTraces,
      autofix,
      dryrun,
      maxTargetBytes,
      jobs,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      // Normalize config to array
      const configs = config ? (Array.isArray(config) ? config : [config]) : ["auto"];

      // Validate inputs against flag injection
      for (const c of configs) {
        assertNoFlagInjection(c, "config");
      }
      for (const p of patterns) {
        assertNoFlagInjection(p, "patterns");
      }
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }
      for (const i of include ?? []) {
        assertNoFlagInjection(i, "include");
      }
      for (const r of excludeRule ?? []) {
        assertNoFlagInjection(r, "excludeRule");
      }
      if (baselineCommit) assertNoFlagInjection(baselineCommit, "baselineCommit");

      const args: string[] = ["scan", "--json", "--quiet"];

      for (const c of configs) {
        args.push("--config", c);
      }

      if (severity) {
        args.push("--severity", severity);
      }

      for (const e of exclude ?? []) {
        args.push("--exclude", e);
      }

      for (const i of include ?? []) {
        args.push("--include", i);
      }

      for (const r of excludeRule ?? []) {
        args.push("--exclude-rule", r);
      }

      if (baselineCommit) {
        args.push("--baseline-commit", baselineCommit);
      }

      if (dataflowTraces) {
        args.push("--dataflow-traces");
      }

      if (autofix) {
        args.push("--autofix");
      }

      if (dryrun) {
        args.push("--dryrun");
      }

      if (maxTargetBytes !== undefined) {
        args.push("--max-target-bytes", String(maxTargetBytes));
      }

      if (jobs !== undefined) {
        args.push("--jobs", String(jobs));
      }

      args.push(...patterns);

      const result = await run("semgrep", args, { cwd, timeout: 300_000 });

      // Use first config for display; join all for the structured output
      const configDisplay = configs.join(",");
      const data = parseSemgrepJson(result.stdout, configDisplay);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatSemgrepScan,
        compactSemgrepScanMap,
        formatSemgrepScanCompact,
        compact === false,
      );
    },
  );
}
