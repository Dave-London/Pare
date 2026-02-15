import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseInstallOutput } from "../lib/parsers.js";
import { formatInstall } from "../lib/formatters.js";
import { NpmInstallSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

/** Registers the `install` tool on the given MCP server. */
export function registerInstallTool(server: McpServer) {
  server.registerTool(
    "install",
    {
      title: "Install Packages",
      description:
        "Runs npm/pnpm/yarn install and returns a structured summary of added/removed packages and vulnerabilities. " +
        "Use instead of running `npm install`, `pnpm install`, or `yarn install` in the terminal. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm). " +
        "Lifecycle scripts (preinstall/postinstall) are skipped by default for safety. " +
        "Set ignoreScripts to false if packages need postinstall scripts to work (e.g., esbuild, sharp).",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments (e.g., package names to install)"),
        ignoreScripts: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Skip lifecycle scripts (preinstall/postinstall). Defaults to true for safety. Set to false if packages need postinstall scripts to run (e.g., esbuild, sharp).",
          ),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmInstallSchema,
    },
    async ({ path, args, ignoreScripts, packageManager, filter }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const flags: string[] = [];
      if (ignoreScripts) flags.push("--ignore-scripts");
      if (pm === "pnpm" && filter) flags.push(`--filter=${filter}`);

      const start = Date.now();
      const result = await runPm(pm, ["install", ...flags, ...(args || [])], cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const output = result.stdout + "\n" + result.stderr;
      const install = parseInstallOutput(output, duration);
      return dualOutput({ ...install, packageManager: pm }, formatInstall);
    },
  );
}
