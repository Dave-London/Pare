import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrView } from "../lib/parsers.js";
import { formatPrView, compactPrViewMap, formatPrViewCompact } from "../lib/formatters.js";
import { PrViewResultSchema } from "../schemas/index.js";

// S-gap: Add author, labels, isDraft, assignees, createdAt, updatedAt, milestone, projectItems
// P1-gap #147: Added reviews to field list
const PR_VIEW_FIELDS =
  "number,state,title,body,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName,additions,deletions,changedFiles,author,labels,isDraft,assignees,createdAt,updatedAt,milestone,projectItems,reviews";

/** Registers the `pr-view` tool on the given MCP server. */
export function registerPrViewTool(server: McpServer) {
  server.registerTool(
    "pr-view",
    {
      title: "PR View",
      description:
        "Views a pull request by number, URL, or branch. Returns structured data with state, checks, review decision, diff stats, author, labels, draft status, assignees, milestone, and timestamps.",
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        comments: z.boolean().optional().describe("Include PR comments in output (-c/--comments)"),
        // S-gap P1: Add repo for cross-repo inspection
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: PrViewResultSchema,
    },
    async ({ number, comments, repo, path, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);

      const args = ["pr", "view", selector, "--json", PR_VIEW_FIELDS];
      if (comments) args.push("--comments");
      if (repo) args.push("--repo", repo);
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr view failed: ${result.stderr}`);
      }

      const data = parsePrView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPrView,
        compactPrViewMap,
        formatPrViewCompact,
        compact === false,
      );
    },
  );
}
