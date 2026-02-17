import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseSearchJson } from "../lib/parsers.js";
import { formatSearch, compactSearchMap, formatSearchCompact } from "../lib/formatters.js";
import { NpmSearchSchema } from "../schemas/index.js";

/** Registers the `search` tool on the given MCP server. */
export function registerSearchTool(server: McpServer) {
  server.registerTool(
    "search",
    {
      title: "Search npm Registry",
      description:
        "Searches the npm registry for packages matching a query. " +
        "Note: pnpm and yarn do not have a search command, so this always uses npm.",
      inputSchema: {
        query: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Search query string"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of results to return (default: 20)"),
        exclude: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Exclude packages matching this text from results (maps to --searchexclude)"),
        registry: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Registry URL to search (maps to --registry, e.g., 'https://npm.pkg.github.com')",
          ),
        searchopts: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Advanced search filtering options (maps to --searchopts)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
        preferOnline: z
          .boolean()
          .optional()
          .describe(
            "Bypass cache and fetch fresh results from the registry (maps to --prefer-online)",
          ),
      },
      outputSchema: NpmSearchSchema,
    },
    async ({ query, path, limit, exclude, registry, searchopts, compact, preferOnline }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(query, "query");
      if (exclude) assertNoFlagInjection(exclude, "exclude");
      if (registry) assertNoFlagInjection(registry, "registry");
      if (searchopts) assertNoFlagInjection(searchopts, "searchopts");

      const args = ["search", query, "--json"];
      if (limit !== undefined) {
        args.push(`--searchlimit=${limit}`);
      }
      if (exclude) {
        args.push(`--searchexclude=${exclude}`);
      }
      if (registry) {
        args.push(`--registry=${registry}`);
      }
      if (searchopts) {
        args.push(`--searchopts=${searchopts}`);
      }
      if (preferOnline) {
        args.push("--prefer-online");
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
