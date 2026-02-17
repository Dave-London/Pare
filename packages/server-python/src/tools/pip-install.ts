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

export function registerPipInstallTool(server: McpServer) {
  server.registerTool(
    "pip-install",
    {
      title: "pip Install",
      description:
        "Runs pip install and returns a structured summary of installed packages. WARNING: may execute untrusted code.",
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
          .describe("Working directory"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be installed without actually installing (--dry-run)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: PipInstallSchema,
    },
    async ({ packages, requirements, path, dryRun, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (requirements) assertNoFlagInjection(requirements, "requirements");

      const args = ["install"];
      if (dryRun) args.push("--dry-run");
      if (requirements) {
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
