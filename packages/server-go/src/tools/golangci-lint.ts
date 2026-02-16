import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { golangciLintCmd } from "../lib/go-runner.js";
import { parseGolangciLintJson } from "../lib/parsers.js";
import {
  formatGolangciLint,
  compactGolangciLintMap,
  formatGolangciLintCompact,
} from "../lib/formatters.js";
import { GolangciLintResultSchema } from "../schemas/index.js";

/** Registers the `golangci-lint` tool on the given MCP server. */
export function registerGolangciLintTool(server: McpServer) {
  server.registerTool(
    "golangci-lint",
    {
      title: "golangci-lint",
      description:
        "Runs golangci-lint and returns structured lint diagnostics (file, line, linter, severity, message). Use instead of running `golangci-lint` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("File patterns or packages to lint (default: ['./...'])"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to golangci-lint config file"),
        fix: z
          .boolean()
          .optional()
          .default(false)
          .describe("Automatically fix found issues where possible (--fix)"),
        fast: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run only fast linters for quick feedback during iteration (--fast)"),
        new: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show only new issues (--new). Useful for incremental linting."),
        newFromRev: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Show only new issues created after the specified git revision (--new-from-rev <rev>). Essential for PR review workflows.",
          ),
        enable: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Enable specific linters (--enable <linter1,linter2,...>)"),
        disable: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Disable specific linters (--disable <linter1,linter2,...>)"),
        timeout: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Timeout for the linter run (--timeout <duration>). Example: '5m', '300s'. Default: 1m.",
          ),
        buildTags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags for correct analysis (--build-tags <tag1,tag2,...>)"),
        concurrency: z
          .number()
          .int()
          .min(1)
          .max(128)
          .optional()
          .describe(
            "Number of CPUs to use for linting (--concurrency <n>). Default: number of CPUs.",
          ),
        maxIssuesPerLinter: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(
            "Maximum issues per linter (--max-issues-per-linter <n>). 0 means unlimited. Default: 50.",
          ),
        maxSameIssues: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(
            "Maximum number of same issues reported (--max-same-issues <n>). 0 means unlimited. Default: 3.",
          ),
        presets: z
          .array(
            z.enum([
              "bugs",
              "comment",
              "complexity",
              "error",
              "format",
              "import",
              "metalinter",
              "module",
              "performance",
              "sql",
              "style",
              "test",
              "unused",
            ]),
          )
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Enable linter presets (--presets <preset1,preset2,...>)"),
        sortResults: z
          .boolean()
          .optional()
          .default(false)
          .describe("Sort lint results for consistent output (--sort-results)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GolangciLintResultSchema,
    },
    async ({
      path,
      patterns,
      config,
      fix,
      fast,
      new: newOnly,
      newFromRev,
      enable,
      disable,
      timeout,
      buildTags,
      concurrency,
      maxIssuesPerLinter,
      maxSameIssues,
      presets,
      sortResults,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      if (config) assertNoFlagInjection(config, "config");
      if (newFromRev) assertNoFlagInjection(newFromRev, "newFromRev");
      if (timeout) assertNoFlagInjection(timeout, "timeout");

      const args = ["run", "--out-format", "json"];
      if (config) args.push("--config", config);
      if (fix) args.push("--fix");
      if (fast) args.push("--fast");
      if (newOnly) args.push("--new");
      if (newFromRev) args.push("--new-from-rev", newFromRev);
      if (enable && enable.length > 0) {
        for (const e of enable) {
          assertNoFlagInjection(e, "enable");
        }
        args.push("--enable", enable.join(","));
      }
      if (disable && disable.length > 0) {
        for (const d of disable) {
          assertNoFlagInjection(d, "disable");
        }
        args.push("--disable", disable.join(","));
      }
      if (timeout) args.push("--timeout", timeout);
      if (buildTags && buildTags.length > 0) {
        for (const t of buildTags) {
          assertNoFlagInjection(t, "buildTags");
        }
        args.push("--build-tags", buildTags.join(","));
      }
      if (concurrency !== undefined) args.push("--concurrency", String(concurrency));
      if (maxIssuesPerLinter !== undefined) {
        args.push("--max-issues-per-linter", String(maxIssuesPerLinter));
      }
      if (maxSameIssues !== undefined) {
        args.push("--max-same-issues", String(maxSameIssues));
      }
      if (presets && presets.length > 0) args.push("--presets", presets.join(","));
      if (sortResults) args.push("--sort-results");
      args.push(...(patterns || ["./..."]));

      const result = await golangciLintCmd(args, cwd);
      // golangci-lint outputs JSON to stdout even on exit code 1 (issues found)
      const data = parseGolangciLintJson(result.stdout, result.exitCode);

      // Set resultsTruncated if limits were set (indicates potential truncation)
      if (
        maxIssuesPerLinter !== undefined &&
        maxIssuesPerLinter > 0 &&
        data.total >= maxIssuesPerLinter
      ) {
        data.resultsTruncated = true;
      }
      if (maxSameIssues !== undefined && maxSameIssues > 0 && data.total > 0) {
        // Check if any linter hit the maxSameIssues limit
        for (const entry of data.byLinter ?? []) {
          if (entry.count >= maxSameIssues) {
            data.resultsTruncated = true;
            break;
          }
        }
      }

      return compactDualOutput(
        data,
        result.stdout,
        formatGolangciLint,
        compactGolangciLintMap,
        formatGolangciLintCompact,
        compact === false,
      );
    },
  );
}
