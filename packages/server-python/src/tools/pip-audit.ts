import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parsePipAuditJson } from "../lib/parsers.js";
import { formatPipAudit, compactPipAuditMap, formatPipAuditCompact } from "../lib/formatters.js";
import { PipAuditResultSchema } from "../schemas/index.js";

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
    async ({ path, requirements, compact }) => {
      const cwd = path || process.cwd();
      if (requirements) assertNoFlagInjection(requirements, "requirements");

      const args = ["audit", "--format", "json"];
      if (requirements) args.push("-r", requirements);

      // pip-audit is a separate tool: pip-audit (not pip audit)
      const { run } = await import("@paretools/shared");
      const result = await run("pip-audit", args, { cwd });
      const data = parsePipAuditJson(result.stdout);
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
