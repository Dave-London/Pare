import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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
        level: z
          .enum(["info", "low", "moderate", "high", "critical"])
          .optional()
          .describe("Minimum severity level to report (maps to --audit-level for npm/pnpm)"),
        production: z
          .boolean()
          .optional()
          .describe(
            "Audit only production (runtime) dependencies (maps to --production for npm, --prod for pnpm, --groups=dependencies for yarn)",
          ),
        omit: z
          .array(z.enum(["dev", "optional", "peer"]))
          .optional()
          .describe(
            "Dependency groups to omit from the audit (maps to --omit for npm, e.g. ['dev', 'optional'])",
          ),
        workspace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Workspace to audit (maps to --workspace for npm)"),
        fix: z
          .boolean()
          .optional()
          .describe(
            "When true, run `npm audit fix` (or `pnpm audit --fix`) to automatically fix vulnerabilities. " +
              "Returns counts of fixed and remaining vulnerabilities.",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Escape-hatch for PM-specific flags not modeled in the schema"),
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
    async ({
      path,
      level,
      production,
      omit,
      workspace,
      fix,
      args,
      packageLockOnly,
      packageManager,
    }) => {
      const cwd = path || process.cwd();
      if (workspace) assertNoFlagInjection(workspace, "workspace");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (fix) {
        pmArgs.push("audit");
        if (pm === "npm") pmArgs.push("fix");
        else if (pm === "pnpm") pmArgs.push("--fix");
        else if (pm === "yarn") pmArgs.push("fix");
        pmArgs.push("--json");
      } else {
        pmArgs.push("audit", "--json");
      }
      if (packageLockOnly && pm === "npm") pmArgs.push("--package-lock-only");
      if (level) {
        if (pm === "npm" || pm === "pnpm") pmArgs.push(`--audit-level=${level}`);
      }
      if (production) {
        if (pm === "npm") pmArgs.push("--production");
        else if (pm === "pnpm") pmArgs.push("--prod");
        else if (pm === "yarn") pmArgs.push("--groups=dependencies");
      }
      if (omit && pm === "npm") {
        for (const group of omit) {
          pmArgs.push(`--omit=${group}`);
        }
      }
      if (workspace && pm === "npm") pmArgs.push(`--workspace=${workspace}`);
      if (args && args.length > 0) pmArgs.push(...args);

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
