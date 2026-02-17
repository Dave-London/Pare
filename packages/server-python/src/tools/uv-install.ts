import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvInstall } from "../lib/parsers.js";
import { formatUvInstall, compactUvInstallMap, formatUvInstallCompact } from "../lib/formatters.js";
import { UvInstallSchema } from "../schemas/index.js";

export function registerUvInstallTool(server: McpServer) {
  server.registerTool(
    "uv-install",
    {
      title: "uv Install",
      description:
        "Runs uv pip install and returns a structured summary of installed packages. " +
        "WARNING: Installing packages may execute arbitrary setup.py code during build. " +
        "Only install trusted packages. Use dryRun to preview what would be installed before committing.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: UvInstallSchema,
    },
    async ({ path, packages, requirements, dryRun, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (requirements) assertNoFlagInjection(requirements, "requirements");

      const args = ["pip", "install"];
      if (dryRun) args.push("--dry-run");

      if (requirements) {
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
