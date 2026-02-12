import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseInfoJson } from "../lib/parsers.js";
import { formatInfo, compactInfoMap, formatInfoCompact } from "../lib/formatters.js";
import { NpmInfoSchema } from "../schemas/index.js";

export function registerInfoTool(server: McpServer) {
  server.registerTool(
    "info",
    {
      title: "npm Info",
      description:
        "Shows detailed package metadata from the npm registry. Use instead of running `npm info` in the terminal.",
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
      },
      outputSchema: NpmInfoSchema,
    },
    async ({ package: pkg, path, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(pkg, "package");

      const result = await npm(["info", pkg, "--json"], cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`npm info failed: ${result.stderr}`);
      }

      const info = parseInfoJson(result.stdout);
      return compactDualOutput(
        info,
        result.stdout,
        formatInfo,
        compactInfoMap,
        formatInfoCompact,
        compact === false,
      );
    },
  );
}
