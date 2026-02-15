import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseInfoJson } from "../lib/parsers.js";
import { formatInfo, compactInfoMap, formatInfoCompact } from "../lib/formatters.js";
import { NpmInfoSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";

/** Registers the `info` tool on the given MCP server. */
export function registerInfoTool(server: McpServer) {
  server.registerTool(
    "info",
    {
      title: "Package Info",
      description:
        "Shows detailed package metadata from the npm registry. " +
        "Works with npm, pnpm, and yarn (all query the same registry). Use instead of running `npm info` or `yarn info` in the terminal.",
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

      // All package managers query the npm registry; yarn uses "info" as well
      const result = await runPm(pm, ["info", pkg, "--json"], cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`${pm} info failed: ${result.stderr}`);
      }

      // Yarn Classic wraps the result in { type: "inspect", data: { ... } }
      let jsonStr = result.stdout;
      if (pm === "yarn") {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === "inspect" && parsed.data) {
            jsonStr = JSON.stringify(parsed.data);
          }
        } catch {
          // fall through, let parseInfoJson handle it
        }
      }

      const info = parseInfoJson(jsonStr);
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
