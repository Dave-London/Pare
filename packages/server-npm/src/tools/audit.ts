import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseAuditJson, parsePnpmAuditJson, parseYarnAuditJson } from "../lib/parsers.js";
import { formatAudit } from "../lib/formatters.js";
import { NpmAuditSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";

/** Registers the `audit` tool on the given MCP server. */
export function registerAuditTool(server: McpServer) {
  server.registerTool(
    "audit",
    {
      title: "Audit Dependencies",
      description:
        "Runs npm/pnpm/yarn audit and returns structured vulnerability data. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm). " +
        "Use instead of running `npm audit`, `pnpm audit`, or `yarn audit` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packageLockOnly: z
          .boolean()
          .optional()
          .describe(
            "Audit from lockfile without requiring node_modules (maps to --package-lock-only for npm)",
          ),
        packageManager: packageManagerInput,
      },
      outputSchema: NpmAuditSchema,
    },
    async ({ path, packageLockOnly, packageManager }) => {
      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs = ["audit", "--json"];
      if (packageLockOnly && pm === "npm") pmArgs.push("--package-lock-only");

      const result = await runPm(pm, pmArgs, cwd);

      // audit returns exit code 1 when vulnerabilities are found, which is expected
      const output = result.stdout || result.stderr;
      const audit =
        pm === "pnpm"
          ? parsePnpmAuditJson(output)
          : pm === "yarn"
            ? parseYarnAuditJson(output)
            : parseAuditJson(output);
      return dualOutput({ ...audit, packageManager: pm }, formatAudit);
    },
  );
}
