import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { conda } from "../lib/python-runner.js";
import { parseCondaListJson, parseCondaInfoJson, parseCondaEnvListJson } from "../lib/parsers.js";
import {
  formatCondaResult,
  compactCondaResultMap,
  formatCondaResultCompact,
} from "../lib/formatters.js";
import { CondaResultSchema } from "../schemas/index.js";

/** Registers the `conda` tool on the given MCP server. */
export function registerCondaTool(server: McpServer) {
  server.registerTool(
    "conda",
    {
      title: "Conda",
      description: "Runs conda commands (list, info, env-list) and returns structured JSON output.",
      inputSchema: {
        action: z.enum(["list", "info", "env-list"]).describe("Conda action to perform"),
        name: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Environment name (used with 'list' action to list packages in a specific env)",
          ),
        prefix: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Environment prefix path as alternative to name (--prefix DIR)"),
        packageFilter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Regex filter for conda list to show only matching packages"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Working directory"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: CondaResultSchema,
    },
    async ({ action, name, prefix, packageFilter, path, compact }) => {
      const cwd = path || process.cwd();
      if (name) assertNoFlagInjection(name, "name");
      if (prefix) assertNoFlagInjection(prefix, "prefix");
      if (packageFilter) assertNoFlagInjection(packageFilter, "packageFilter");

      switch (action) {
        case "list": {
          const args = ["list", "--json"];
          if (name) args.push("--name", name);
          else if (prefix) args.push("--prefix", prefix);
          if (packageFilter) args.push(packageFilter);
          const result = await conda(args, cwd);
          const data = parseCondaListJson(result.stdout, name);
          return compactDualOutput(
            data,
            result.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "info": {
          const result = await conda(["info", "--json"], cwd);
          const data = parseCondaInfoJson(result.stdout);
          return compactDualOutput(
            data,
            result.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "env-list": {
          // Get env list and info (for active prefix) in parallel
          const [envResult, infoResult] = await Promise.all([
            conda(["env", "list", "--json"], cwd),
            conda(["info", "--json"], cwd),
          ]);
          let activePrefix: string | undefined;
          try {
            const infoData = JSON.parse(infoResult.stdout);
            activePrefix = infoData.active_prefix || undefined;
          } catch {
            // ignore parse errors for active prefix detection
          }
          const data = parseCondaEnvListJson(envResult.stdout, activePrefix);
          return compactDualOutput(
            data,
            envResult.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
      }
    },
  );
}
