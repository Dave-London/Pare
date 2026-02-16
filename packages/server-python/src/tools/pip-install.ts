import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipInstall } from "../lib/parsers.js";
import {
  formatPipInstall,
  compactPipInstallMap,
  formatPipInstallCompact,
} from "../lib/formatters.js";
import { PipInstallSchema } from "../schemas/index.js";

/** Registers the `pip-install` tool on the given MCP server. */
export function registerPipInstallTool(server: McpServer) {
  server.registerTool(
    "pip-install",
    {
      title: "pip Install",
      description:
        "Runs pip install and returns a structured summary of installed packages. " +
        "Use instead of running `pip install` in the terminal. " +
        "WARNING: Installing packages may execute arbitrary setup.py code. " +
        "Only install trusted packages. Use dryRun to preview what would be installed before committing.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Packages to install (empty for requirements.txt)"),
        requirements: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to requirements file"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be installed without actually installing (--dry-run)"),
        upgrade: z
          .boolean()
          .optional()
          .default(false)
          .describe("Upgrade already-installed packages to the newest version (--upgrade / -U)"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not install package dependencies (--no-deps)"),
        pre: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include pre-release and development versions (--pre)"),
        forceReinstall: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Force reinstall of all packages even if already installed (--force-reinstall)",
          ),
        constraint: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to constraints file for version pinning (-c FILE)"),
        editable: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to local package for editable install (-e PATH)"),
        indexUrl: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Base URL of the Python Package Index (-i URL)"),
        extraIndexUrl: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Extra package index URLs for additional registries"),
        target: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Install packages into target directory (-t DIR)"),
        report: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Write JSON install report to file (--report FILE)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PipInstallSchema,
    },
    async ({
      packages,
      requirements,
      path,
      dryRun,
      upgrade,
      noDeps,
      pre,
      forceReinstall,
      constraint,
      editable,
      indexUrl,
      extraIndexUrl,
      target,
      report,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (requirements) assertNoFlagInjection(requirements, "requirements");
      if (constraint) assertNoFlagInjection(constraint, "constraint");
      if (editable) assertNoFlagInjection(editable, "editable");
      if (indexUrl) assertNoFlagInjection(indexUrl, "indexUrl");
      if (target) assertNoFlagInjection(target, "target");
      if (report) assertNoFlagInjection(report, "report");
      for (const u of extraIndexUrl ?? []) {
        assertNoFlagInjection(u, "extraIndexUrl");
      }

      const args = ["install"];
      if (dryRun) args.push("--dry-run");
      if (upgrade) args.push("--upgrade");
      if (noDeps) args.push("--no-deps");
      if (pre) args.push("--pre");
      if (forceReinstall) args.push("--force-reinstall");
      if (constraint) args.push("-c", constraint);
      if (indexUrl) args.push("-i", indexUrl);
      for (const u of extraIndexUrl ?? []) {
        args.push("--extra-index-url", u);
      }
      if (target) args.push("-t", target);
      if (report) args.push("--report", report);

      if (editable) {
        args.push("-e", editable);
      } else if (requirements) {
        args.push("-r", requirements);
      } else if (packages && packages.length > 0) {
        args.push(...packages);
      } else {
        args.push("-r", "requirements.txt");
      }

      const result = await pip(args, cwd);
      const data = parsePipInstall(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipInstall,
        compactPipInstallMap,
        formatPipInstallCompact,
        compact === false,
      );
    },
  );
}
