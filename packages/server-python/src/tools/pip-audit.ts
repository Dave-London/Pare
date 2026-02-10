import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { parsePipAuditJson } from "../lib/parsers.js";
import { formatPipAudit } from "../lib/formatters.js";
import { PipAuditResultSchema } from "../schemas/index.js";

export function registerPipAuditTool(server: McpServer) {
  server.registerTool(
    "pip-audit",
    {
      title: "pip Audit",
      description: "Runs pip-audit and returns a structured vulnerability report",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        requirements: z.string().optional().describe("Path to requirements file"),
      },
      outputSchema: PipAuditResultSchema,
    },
    async ({ path, requirements }) => {
      const cwd = path || process.cwd();
      const args = ["audit", "--format", "json"];
      if (requirements) args.push("-r", requirements);

      // pip-audit is a separate tool: pip-audit (not pip audit)
      const { run } = await import("@paretools/shared");
      const result = await run("pip-audit", args, { cwd });
      const data = parsePipAuditJson(result.stdout);
      return dualOutput(data, formatPipAudit);
    },
  );
}
