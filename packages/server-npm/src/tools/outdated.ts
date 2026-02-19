import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
} from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseOutdatedJson, parseYarnOutdatedJson } from "../lib/parsers.js";
import { formatOutdated } from "../lib/formatters.js";
import { NpmOutdatedSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

/** Registers the `outdated` tool on the given MCP server. */
export function registerOutdatedTool(server: McpServer) {
  server.registerTool(
    "outdated",
    {
      title: "Outdated Packages",
      description:
        "Checks for outdated packages and returns structured update information. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm).",
      inputSchema: {
        path: projectPathInput,
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific package names to check for updates"),
        workspace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Workspace to check (maps to --workspace for npm)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Escape-hatch for PM-specific flags not modeled in the schema"),
        production: z
          .boolean()
          .optional()
          .describe(
            "Check only production dependencies (maps to --omit=dev for npm, --prod for pnpm)",
          ),
        all: z
          .boolean()
          .optional()
          .describe("Show all nested outdated dependencies (maps to --all for npm)"),
        long: z
          .boolean()
          .optional()
          .describe(
            "Show extended info such as homepage and repository URLs (maps to --long for npm/pnpm)",
          ),
        compatible: z
          .boolean()
          .optional()
          .describe("Show only semver-compatible updates (maps to --compatible for pnpm)"),
        devOnly: z
          .boolean()
          .optional()
          .describe("Check only dev dependencies (maps to --dev for pnpm)"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmOutdatedSchema,
    },
    async ({
      path,
      packages,
      workspace,
      args,
      production,
      all,
      long: showLong,
      compatible,
      devOnly,
      packageManager,
      filter,
    }) => {
      if (filter) assertNoFlagInjection(filter, "filter");
      if (workspace) assertNoFlagInjection(workspace, "workspace");
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);
      pmArgs.push("outdated", "--json");

      if (production) {
        if (pm === "npm") pmArgs.push("--omit=dev");
        else if (pm === "pnpm") pmArgs.push("--prod");
      }
      if (all && pm === "npm") pmArgs.push("--all");
      if (showLong && pm !== "yarn") pmArgs.push("--long");
      if (compatible && pm === "pnpm") pmArgs.push("--compatible");
      if (devOnly && pm === "pnpm") pmArgs.push("--dev");
      if (workspace && pm === "npm") pmArgs.push(`--workspace=${workspace}`);
      if (packages && packages.length > 0) pmArgs.push(...packages);
      if (args && args.length > 0) pmArgs.push(...args);

      const result = await runPm(pm, pmArgs, cwd);

      // outdated returns exit code 1 when outdated packages exist, which is expected
      const output = result.stdout || "{}";
      const outdated =
        pm === "yarn" ? parseYarnOutdatedJson(output) : parseOutdatedJson(output, pm);
      return dualOutput({ ...outdated, packageManager: pm }, formatOutdated);
    },
  );
}
