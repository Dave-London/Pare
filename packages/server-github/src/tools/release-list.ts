import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseReleaseList } from "../lib/parsers.js";
import {
  formatReleaseList,
  compactReleaseListMap,
  formatReleaseListCompact,
} from "../lib/formatters.js";
import { ReleaseListResultSchema } from "../schemas/index.js";

const RELEASE_LIST_FIELDS = "tagName,name,isDraft,isPrerelease,publishedAt,url";

export function registerReleaseListTool(server: McpServer) {
  server.registerTool(
    "release-list",
    {
      title: "Release List",
      description:
        "Lists GitHub releases for a repository. Returns structured list with tag, name, draft/prerelease status, publish date, and URL.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of releases to return (default: 10)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in owner/repo format (default: current repo)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: ReleaseListResultSchema,
    },
    async ({ limit, repo, path, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["release", "list", "--json", RELEASE_LIST_FIELDS, "--limit", String(limit)];
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh release list failed: ${result.stderr}`);
      }

      const data = parseReleaseList(result.stdout);
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
