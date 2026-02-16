import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  INPUT_LIMITS,
  assertNoFlagInjection,
  assertAllowedRoot,
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
        "Runs Semgrep static analysis with structured rules and findings. Returns structured finding data with severity summary. Use instead of running `semgrep` in the terminal.",
      inputSchema: {
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns or paths to scan (default: ['.'])"),
        config: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("auto")
          .describe(
            'Semgrep config/ruleset (e.g. "auto", "p/security-audit", "p/owasp-top-ten"). Default: "auto"',
          ),
        severity: z
          .enum(["INFO", "WARNING", "ERROR"])
          .optional()
          .describe("Severity filter. Default: all severities"),
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
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: SemgrepScanResultSchema,
    },
    async ({
      patterns,
      config,
      severity,
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

      // Validate inputs against flag injection
      if (config) assertNoFlagInjection(config, "config");
      for (const p of patterns) {
        assertNoFlagInjection(p, "patterns");
      }

      const args: string[] = ["scan", "--json", "--quiet"];

      if (config) {
        args.push("--config", config);
      }

      if (severity) {
        args.push("--severity", severity);
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

      const data = parseSemgrepJson(result.stdout, config);
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
