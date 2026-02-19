import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  repoPathInput,
} from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseReleaseList } from "../lib/parsers.js";
import {
  formatReleaseList,
  compactReleaseListMap,
  formatReleaseListCompact,
} from "../lib/formatters.js";
import { ReleaseListResultSchema } from "../schemas/index.js";

// S-gap: Add isLatest and createdAt to JSON fields
const RELEASE_LIST_FIELDS = "tagName,name,isDraft,isPrerelease,publishedAt,url,isLatest,createdAt";

/** Registers the `release-list` tool on the given MCP server. */
export function registerReleaseListTool(server: McpServer) {
  server.registerTool(
    "release-list",
    {
      title: "Release List",
      description:
        "Lists GitHub releases for a repository. Returns structured list with tag, name, draft/prerelease/latest status, publish date, creation date, and URL.",
      inputSchema: {
        // S-gap P1: Align default limit to CLI default (30)
        limit: z
          .number()
          .optional()
          .default(30)
          .describe("Maximum number of releases to return (default: 30)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in owner/repo format (default: current repo)"),
        excludeDrafts: z
          .boolean()
          .optional()
          .describe("Exclude draft releases from the list (--exclude-drafts)"),
        excludePreReleases: z
          .boolean()
          .optional()
          .describe("Exclude pre-releases from the list (--exclude-pre-releases)"),
        // S-gap P1: Add order param
        order: z.enum(["asc", "desc"]).optional().describe("Sort order (--order). Default: desc."),
        path: repoPathInput,
        compact: compactInput,
      },
      outputSchema: ReleaseListResultSchema,
    },
    async ({ limit, repo, excludeDrafts, excludePreReleases, order, path, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["release", "list", "--json", RELEASE_LIST_FIELDS, "--limit", String(limit)];
      if (repo) args.push("--repo", repo);
      if (excludeDrafts) args.push("--exclude-drafts");
      if (excludePreReleases) args.push("--exclude-pre-releases");
      if (order) args.push("--order", order);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh release list failed: ${result.stderr}`);
      }

      let totalAvailable: number | undefined;
      if (limit < 1000) {
        const countArgs = ["release", "list", "--json", RELEASE_LIST_FIELDS, "--limit", "1000"];
        if (repo) countArgs.push("--repo", repo);
        if (excludeDrafts) countArgs.push("--exclude-drafts");
        if (excludePreReleases) countArgs.push("--exclude-pre-releases");
        if (order) countArgs.push("--order", order);
        const countResult = await ghCmd(countArgs, cwd);
        if (countResult.exitCode === 0) {
          totalAvailable = parseReleaseList(countResult.stdout).total;
        }
      }

      const data = parseReleaseList(result.stdout, totalAvailable);
      return compactDualOutput(
        data,
        result.stdout,
        formatReleaseList,
        compactReleaseListMap,
        formatReleaseListCompact,
        compact === false,
      );
    },
  );
}
