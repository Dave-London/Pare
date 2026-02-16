import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvInstall } from "../lib/parsers.js";
import { formatUvInstall, compactUvInstallMap, formatUvInstallCompact } from "../lib/formatters.js";
import { UvInstallSchema } from "../schemas/index.js";

/** Registers the `uv-install` tool on the given MCP server. */
export function registerUvInstallTool(server: McpServer) {
  server.registerTool(
    "uv-install",
    {
      title: "uv Install",
      description:
        "Runs uv pip install and returns a structured summary of installed packages. " +
        "Use instead of running `uv pip install` in the terminal. " +
        "WARNING: Installing packages may execute arbitrary setup.py code during build. " +
        "Only install trusted packages. Use dryRun to preview what would be installed before committing.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Packages to install"),
        requirements: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to requirements file"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be installed without actually installing (--dry-run)"),
        verifyHashes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Verify package hashes for supply-chain security (--verify-hashes)"),
        upgrade: z
          .boolean()
          .optional()
          .default(false)
          .describe("Upgrade already-installed packages to the newest version (--upgrade)"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not install package dependencies (--no-deps)"),
        reinstall: z
          .boolean()
          .optional()
          .default(false)
          .describe("Force reinstall of all packages even if already installed (--reinstall)"),
        editable: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to local package for editable install (-e PATH)"),
        constraint: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to constraints file for version pinning (-c FILE)"),
        indexUrl: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Base URL of the Python Package Index (-i URL)"),
        python: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Python interpreter version to use (-p VERSION)"),
        extras: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Package extras to install (--extra NAME)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: UvInstallSchema,
    },
    async ({
      path,
      packages,
      requirements,
      dryRun,
      verifyHashes,
      upgrade,
      noDeps,
      reinstall,
      editable,
      constraint,
      indexUrl,
      python,
      extras,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (requirements) assertNoFlagInjection(requirements, "requirements");
      if (editable) assertNoFlagInjection(editable, "editable");
      if (constraint) assertNoFlagInjection(constraint, "constraint");
      if (indexUrl) assertNoFlagInjection(indexUrl, "indexUrl");
      if (python) assertNoFlagInjection(python, "python");
      for (const e of extras ?? []) {
        assertNoFlagInjection(e, "extras");
      }

      const args = ["pip", "install"];
      if (dryRun) args.push("--dry-run");
      if (verifyHashes) args.push("--verify-hashes");
      if (upgrade) args.push("--upgrade");
      if (noDeps) args.push("--no-deps");
      if (reinstall) args.push("--reinstall");
      if (constraint) args.push("-c", constraint);
      if (indexUrl) args.push("-i", indexUrl);
      if (python) args.push("-p", python);
      for (const e of extras ?? []) {
        args.push("--extra", e);
      }

      if (editable) {
        args.push("-e", editable);
      } else if (requirements) {
        args.push("-r", requirements);
      } else if (packages && packages.length > 0) {
        args.push(...packages);
      } else {
        args.push("-r", "requirements.txt");
      }

      const result = await uv(args, cwd);
      const data = parseUvInstall(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatUvInstall,
        compactUvInstallMap,
        formatUvInstallCompact,
        compact === false,
      );
    },
  );
}
