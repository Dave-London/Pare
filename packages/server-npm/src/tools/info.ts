import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseInfoJson } from "../lib/parsers.js";
import { formatInfo, compactInfoMap, formatInfoCompact } from "../lib/formatters.js";
import { NpmInfoSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";

export function registerInfoTool(server: McpServer) {
  server.registerTool(
    "info",
    {
      title: "Package Info",
      description:
        "Shows detailed package metadata from the npm registry. " +
        "Works with both npm and pnpm (both query the same registry). Use instead of running `npm info` in the terminal.",
      inputSchema: {
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Package name to look up (e.g. 'express', 'lodash@4.17.21')"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
        packageManager: packageManagerInput,
      },
      outputSchema: NpmInfoSchema,
    },
    async ({ package: pkg, path, compact, packageManager }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(pkg, "package");
      const pm = await detectPackageManager(cwd, packageManager);

      // pnpm info is an alias for npm info — both work the same way
      const result = await runPm(pm, ["info", pkg, "--json"], cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`${pm} info failed: ${result.stderr}`);
      }

      const info = parseInfoJson(result.stdout);
      const infoWithPm = { ...info, packageManager: pm };
      return compactDualOutput(
        infoWithPm,
        result.stdout,
        formatInfo,
        compactInfoMap,
        formatInfoCompact,
        compact === false,
      );
    },
  );
}
