import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseAuditJson } from "../lib/parsers.js";
import { formatAudit } from "../lib/formatters.js";
import { NpmAuditSchema } from "../schemas/index.js";

export function registerAuditTool(server: McpServer) {
  server.registerTool(
    "audit",
    {
      title: "npm Audit",
      description:
        "Runs npm audit and returns structured vulnerability data. Use instead of running `npm audit` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
      },
      outputSchema: NpmAuditSchema,
    },
    async ({ path }) => {
      const cwd = path || process.cwd();
      const result = await npm(["audit", "--json"], cwd);

      // npm audit returns exit code 1 when vulnerabilities are found, which is expected
      const output = result.stdout || result.stderr;
      const audit = parseAuditJson(output);
      return dualOutput(audit, formatAudit);
    },
  );
}
