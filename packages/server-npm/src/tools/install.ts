import { z } from "zod";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
} from "@paretools/shared";
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
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm). " +
        "Lifecycle scripts (preinstall/postinstall) are skipped by default for safety. " +
        "Set ignoreScripts to false if packages need postinstall scripts to work (e.g., esbuild, sharp).",
      inputSchema: {
        path: projectPathInput,
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
        saveDev: z
          .boolean()
          .optional()
          .describe("Install as dev dependency (maps to --save-dev / -D)"),
        frozenLockfile: z
          .boolean()
          .optional()
          .describe(
            "Fail if lockfile needs updating — for CI workflows (maps to --frozen-lockfile for pnpm/yarn, --ci for npm)",
          ),
        dryRun: z
          .boolean()
          .optional()
          .describe(
            "Preview what would be installed without actually installing (maps to --dry-run)",
          ),
        production: z
          .boolean()
          .optional()
          .describe(
            "Install only production dependencies (maps to --omit=dev for npm, --prod for pnpm, --production for yarn)",
          ),
        legacyPeerDeps: z
          .boolean()
          .optional()
          .describe("Ignore peer dependency conflicts (maps to --legacy-peer-deps, npm only)"),
        force: z
          .boolean()
          .optional()
          .describe("Force reinstallation of all packages (maps to --force)"),
        noAudit: z
          .boolean()
          .optional()
          .describe("Skip the automatic audit step to speed up installation (maps to --no-audit)"),
        exact: z
          .boolean()
          .optional()
          .describe("Save exact versions instead of semver ranges (maps to --save-exact / -E)"),
        global: z
          .boolean()
          .optional()
          .describe(
            "Install packages globally (maps to --global / -g). Use with caution — may require elevated permissions.",
          ),
        registry: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Registry URL to install from (maps to --registry, e.g., 'https://npm.pkg.github.com')",
          ),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmInstallSchema,
    },
    async ({
      path,
      args,
      ignoreScripts,
      saveDev,
      frozenLockfile,
      dryRun,
      production,
      legacyPeerDeps,
      force,
      noAudit,
      exact,
      global: isGlobal,
      registry,
      packageManager,
      filter,
    }) => {
      if (filter) assertNoFlagInjection(filter, "filter");
      if (registry) assertNoFlagInjection(registry, "registry");

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const flags: string[] = [];
      if (ignoreScripts) flags.push("--ignore-scripts");
      if (pm === "pnpm" && filter) flags.push(`--filter=${filter}`);
      if (saveDev) flags.push("--save-dev");
      if (frozenLockfile) {
        if (pm !== "npm") flags.push("--frozen-lockfile");
      }
      if (dryRun) flags.push("--dry-run");
      if (production) {
        if (pm === "npm") flags.push("--omit=dev");
        else if (pm === "pnpm") flags.push("--prod");
        else flags.push("--production");
      }
      if (legacyPeerDeps && pm === "npm") flags.push("--legacy-peer-deps");
      if (force) flags.push("--force");
      if (noAudit) flags.push("--no-audit");
      if (exact) flags.push("--save-exact");
      if (isGlobal) flags.push("--global");
      if (registry) flags.push(`--registry=${registry}`);
      if (pm === "npm") flags.push("--json");

      const subcommand = frozenLockfile && pm === "npm" ? "ci" : "install";
      const beforeLockfileHash = await getLockfileHash(cwd, pm);
      const start = Date.now();
      const result = await runPm(pm, [subcommand, ...flags, ...(args || [])], cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;
      const afterLockfileHash = await getLockfileHash(cwd, pm);
      const lockfileChanged = beforeLockfileHash !== afterLockfileHash;

      const output = result.stdout + "\n" + result.stderr;
      const install = parseInstallOutput(output, duration);
      return dualOutput({ ...install, packageManager: pm, lockfileChanged }, formatInstall);
    },
  );
}

async function getLockfileHash(
  cwd: string,
  pm: "npm" | "pnpm" | "yarn",
): Promise<string | undefined> {
  const lockfileName =
    pm === "pnpm" ? "pnpm-lock.yaml" : pm === "yarn" ? "yarn.lock" : "package-lock.json";
  const lockfilePath = `${cwd}/${lockfileName}`;

  try {
    const content = await readFile(lockfilePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return undefined;
  }
}
