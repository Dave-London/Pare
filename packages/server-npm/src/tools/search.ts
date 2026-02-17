import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseSearchJson } from "../lib/parsers.js";
import { formatSearch, compactSearchMap, formatSearchCompact } from "../lib/formatters.js";
import { NpmSearchSchema } from "../schemas/index.js";

export function registerSearchTool(server: McpServer) {
  server.registerTool(
    "search",
    {
      title: "Search npm Registry",
      description:
        "Searches the npm registry for packages matching a query. Use instead of running `npm search` in the terminal. " +
        "Note: pnpm and yarn do not have a search command, so this always uses npm.",
      inputSchema: {
        query: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Search query string"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of results to return (default: 20)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: NpmSearchSchema,
    },
    async ({ query, path, limit, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(query, "query");

      const args = ["search", query, "--json"];
      if (limit !== undefined) {
        args.push(`--searchlimit=${limit}`);
      }

      // Always use npm for search — pnpm doesn't have a search command
      const result = await npm(args, cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`npm search failed: ${result.stderr}`);
      }

      const search = parseSearchJson(result.stdout || "[]");
      const searchWithPm = { ...search, packageManager: "npm" as const };
      return compactDualOutput(
        searchWithPm,
        result.stdout || "[]",
        formatSearch,
        compactSearchMap,
        formatSearchCompact,
        compact === false,
      );
    },
  );
}
