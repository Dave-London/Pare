import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pipAudit } from "../lib/python-runner.js";
import { parsePipAuditJson } from "../lib/parsers.js";
import { formatPipAudit, compactPipAuditMap, formatPipAuditCompact } from "../lib/formatters.js";
import { PipAuditResultSchema } from "../schemas/index.js";

/** Registers the `pip-audit` tool on the given MCP server. */
export function registerPipAuditTool(server: McpServer) {
  server.registerTool(
    "pip-audit",
    {
      title: "pip Audit",
      description:
        "Runs pip-audit and returns a structured vulnerability report. Use instead of running `pip-audit` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        requirements: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to requirements file"),
        fix: z
          .boolean()
          .optional()
          .default(false)
          .describe("Auto-remediate vulnerabilities (--fix)"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview fix changes without applying (--dry-run)"),
        strict: z
          .boolean()
          .optional()
          .default(false)
          .describe("Fail on skipped dependencies (-S, --strict)"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip auditing dependencies (--no-deps)"),
        skipEditable: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip auditing editable packages (--skip-editable)"),
        local: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only audit packages in the local virtualenv (-l, --local)"),
        ignoreVuln: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Vulnerability IDs to suppress (e.g. PYSEC-2023-001)"),
        vulnerabilityService: z
          .enum(["osv", "pypi"])
          .optional()
          .describe("Vulnerability service to query (default: pypi)"),
        indexUrl: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Custom package index URL for corporate/private registry support"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PipAuditResultSchema,
    },
    async ({
      path,
      requirements,
      fix,
      dryRun,
      strict,
      noDeps,
      skipEditable,
      local,
      ignoreVuln,
      vulnerabilityService,
      indexUrl,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (requirements) assertNoFlagInjection(requirements, "requirements");
      if (indexUrl) assertNoFlagInjection(indexUrl, "indexUrl");
      for (const v of ignoreVuln ?? []) {
        assertNoFlagInjection(v, "ignoreVuln");
      }

      const args = ["--format", "json"];
      if (requirements) args.push("-r", requirements);
      if (fix) args.push("--fix");
      if (dryRun) args.push("--dry-run");
      if (strict) args.push("--strict");
      if (noDeps) args.push("--no-deps");
      if (skipEditable) args.push("--skip-editable");
      if (local) args.push("--local");
      if (vulnerabilityService) args.push("--vulnerability-service", vulnerabilityService);
      if (indexUrl) args.push("--index-url", indexUrl);
      for (const v of ignoreVuln ?? []) {
        args.push("--ignore-vuln", v);
      }

      // pip-audit is a standalone binary, NOT a pip subcommand
      const result = await pipAudit(args, cwd);
      const data = parsePipAuditJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipAudit,
        compactPipAuditMap,
        formatPipAuditCompact,
        compact === false,
      );
    },
  );
}
