import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseAuditJson, parsePnpmAuditJson } from "../lib/parsers.js";
import { formatAudit } from "../lib/formatters.js";
import { NpmAuditSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";

export function registerAuditTool(server: McpServer) {
  server.registerTool(
    "audit",
    {
      title: "Audit Dependencies",
      description:
        "Runs npm/pnpm audit and returns structured vulnerability data. " +
        "Auto-detects pnpm via pnpm-lock.yaml. Use instead of running `npm audit` or `pnpm audit` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packageManager: packageManagerInput,
      },
      outputSchema: NpmAuditSchema,
    },
    async ({ path, packageManager }) => {
      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);
      const result = await runPm(pm, ["audit", "--json"], cwd);

      // audit returns exit code 1 when vulnerabilities are found, which is expected
      const output = result.stdout || result.stderr;
      const audit = pm === "pnpm" ? parsePnpmAuditJson(output) : parseAuditJson(output);
      return dualOutput({ ...audit, packageManager: pm }, formatAudit);
    },
  );
}
