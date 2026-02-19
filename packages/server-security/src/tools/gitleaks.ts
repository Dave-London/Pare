import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  INPUT_LIMITS,
  assertAllowedRoot,
  assertNoFlagInjection,
  assertValidLogOpts,
} from "@paretools/shared";
import { parseGitleaksJson } from "../lib/parsers.js";
import {
  formatGitleaksScan,
  compactGitleaksScanMap,
  formatGitleaksScanCompact,
} from "../lib/formatters.js";
import { GitleaksScanResultSchema } from "../schemas/index.js";

/** Registers the `gitleaks` tool on the given MCP server. */
export function registerGitleaksTool(server: McpServer) {
  server.registerTool(
    "gitleaks",
    {
      title: "Gitleaks Secret Detection",
      description:
        "Runs Gitleaks to detect hardcoded secrets in git repositories. Returns structured finding data with redacted secrets.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path to scan"),
        redact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Redact raw secrets in output (--redact). Defaults to true to prevent secret leakage to LLM context.",
          ),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to custom gitleaks rule file (--config)"),
        baselinePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to baseline report for differential scanning (--baseline-path)"),
        logOpts: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Git log options for scanning specific commit ranges/time windows (--log-opts, e.g., '--since=2024-01-01')",
          ),
        enableRule: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Enable specific rules by ID (--enable-rule, e.g., ['aws-access-key'])"),
        noGit: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Scan files without git history (--no-git). Useful for scanning non-git directories.",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable verbose output from gitleaks"),
        followSymlinks: z
          .boolean()
          .optional()
          .describe("Follow symbolic links during scan (--follow-symlinks)"),
        maxTargetMegabytes: z
          .number()
          .optional()
          .describe("Skip files larger than this size in MB (--max-target-megabytes)"),
        logLevel: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Log level for gitleaks output (--log-level, e.g. 'debug', 'info', 'warn', 'error')",
          ),
        exitCode: z
          .number()
          .optional()
          .describe("Exit code when findings are detected (--exit-code)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: GitleaksScanResultSchema,
    },
    async ({
      path,
      redact,
      config,
      baselinePath,
      logOpts,
      enableRule,
      noGit,
      verbose,
      followSymlinks,
      maxTargetMegabytes,
      logLevel,
      exitCode,
      compact,
    }) => {
      if (config) assertNoFlagInjection(config, "config");
      if (baselinePath) assertNoFlagInjection(baselinePath, "baselinePath");
      if (logOpts) assertValidLogOpts(logOpts, "logOpts");
      if (logLevel) assertNoFlagInjection(logLevel, "logLevel");
      for (const r of enableRule ?? []) {
        assertNoFlagInjection(r, "enableRule");
      }

      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      const args: string[] = ["detect", "--report-format", "json", "--report-path", "/dev/stdout"];

      // Default to redacting secrets to prevent leakage
      if (redact !== false) {
        args.push("--redact");
      }

      if (config) {
        args.push("--config", config);
      }

      if (baselinePath) {
        args.push("--baseline-path", baselinePath);
      }

      if (logOpts) {
        args.push("--log-opts", logOpts);
      }

      for (const r of enableRule ?? []) {
        args.push("--enable-rule", r);
      }

      if (noGit) {
        args.push("--no-git");
      }

      if (verbose) {
        args.push("--verbose");
      }

      if (followSymlinks) {
        args.push("--follow-symlinks");
      }

      if (maxTargetMegabytes !== undefined) {
        args.push("--max-target-megabytes", String(maxTargetMegabytes));
      }

      if (logLevel) {
        args.push("--log-level", logLevel);
      }

      if (exitCode !== undefined) {
        args.push("--exit-code", String(exitCode));
      }

      args.push("--source", cwd);

      // gitleaks exits with code 1 when findings are detected, which is not an error
      const result = await run("gitleaks", args, { cwd, timeout: 300_000 });

      const data = parseGitleaksJson(result.stdout);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatGitleaksScan,
        compactGitleaksScanMap,
        formatGitleaksScanCompact,
        compact === false,
      );
    },
  );
}
