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
import { parseDiscussionList } from "../lib/parsers.js";
import {
  formatDiscussionList,
  compactDiscussionListMap,
  formatDiscussionListCompact,
} from "../lib/formatters.js";
import { DiscussionListResultSchema } from "../schemas/index.js";

function classifyDiscussionListError(text: string): "not-found" | "permission-denied" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no repository/i.test(lower)) return "not-found";
  if (/forbidden|permission|403/i.test(lower)) return "permission-denied";
  return "unknown";
}

/**
 * Builds a GraphQL query string for listing discussions.
 * Uses the GitHub GraphQL API since `gh discussion list` has limited JSON support.
 */
function buildDiscussionQuery(
  owner: string,
  name: string,
  limit: number,
  category?: string,
): string {
  const categoryFilter = category ? `, categoryId: "${category}"` : "";
  return `{
  repository(owner: "${owner}", name: "${name}") {
    discussions(first: ${limit}${categoryFilter}, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        author { login }
        category { name }
        createdAt
        url
        isAnswered
        comments { totalCount }
      }
    }
  }
}`;
}

/** Registers the `discussion-list` tool on the given MCP server. */
export function registerDiscussionListTool(server: McpServer) {
  server.registerTool(
    "discussion-list",
    {
      title: "Discussion List",
      description:
        "Lists GitHub Discussions for a repository via GraphQL. Returns structured list with discussion number, title, author, category, answered status, and comment count.",
      inputSchema: {
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Repository in OWNER/REPO format"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of discussions to return (default: 20)"),
        category: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by discussion category ID"),
        path: repoPathInput,
        compact: compactInput,
      },
      outputSchema: DiscussionListResultSchema,
    },
    async ({ repo, limit, category, path, compact }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(repo, "repo");
      if (category) assertNoFlagInjection(category, "category");

      // Parse OWNER/REPO
      const parts = repo.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error("repo must be in OWNER/REPO format");
      }
      const [owner, name] = parts;

      const query = buildDiscussionQuery(owner, name, limit, category);
      const args = ["api", "graphql", "-f", `query=${query}`];

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return compactDualOutput(
          {
            discussions: [],
            errorType: classifyDiscussionListError(combined),
            errorMessage: combined || "gh api graphql failed",
          },
          "",
          formatDiscussionList,
          compactDiscussionListMap,
          formatDiscussionListCompact,
          compact === false,
        );
      }

      const data = parseDiscussionList(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatDiscussionList,
        compactDiscussionListMap,
        formatDiscussionListCompact,
        compact === false,
      );
    },
  );
}
