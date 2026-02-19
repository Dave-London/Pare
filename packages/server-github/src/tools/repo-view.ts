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
import { parseRepoView } from "../lib/parsers.js";
import { formatRepoView, compactRepoViewMap, formatRepoViewCompact } from "../lib/formatters.js";
import { RepoViewResultSchema } from "../schemas/index.js";

const REPO_VIEW_FIELDS =
  "name,owner,description,url,homepageUrl,defaultBranchRef,isArchived,isFork,isPrivate,stargazerCount,forkCount,languages,repositoryTopics,licenseInfo,createdAt,updatedAt,pushedAt";

function classifyRepoViewError(text: string): "not-found" | "permission-denied" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no repository/i.test(lower)) return "not-found";
  if (/forbidden|permission|403/i.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `repo-view` tool on the given MCP server. */
export function registerRepoViewTool(server: McpServer) {
  server.registerTool(
    "repo-view",
    {
      title: "Repo View",
      description:
        "Views repository details. Returns structured data with name, owner, description, stars, forks, languages, topics, license, and dates.",
      inputSchema: {
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
        compact: compactInput,
      },
      outputSchema: RepoViewResultSchema,
    },
    async ({ repo, path, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["repo", "view", "--json", REPO_VIEW_FIELDS];
      if (repo) args.splice(2, 0, repo);
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return compactDualOutput(
          {
            name: "",
            owner: "",
            description: null,
            url: "",
            defaultBranch: "",
            isPrivate: false,
            isArchived: false,
            isFork: false,
            stars: 0,
            forks: 0,
            errorType: classifyRepoViewError(combined),
            errorMessage: combined || "gh repo view failed",
          },
          "",
          formatRepoView,
          compactRepoViewMap,
          formatRepoViewCompact,
          compact === false,
        );
      }

      const data = parseRepoView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatRepoView,
        compactRepoViewMap,
        formatRepoViewCompact,
        compact === false,
      );
    },
  );
}
