import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueView } from "../lib/parsers.js";
import { formatIssueView, compactIssueViewMap, formatIssueViewCompact } from "../lib/formatters.js";
import { IssueViewResultSchema } from "../schemas/index.js";

// S-gap: Add stateReason, author, milestone, updatedAt, closedAt, isPinned, projectItems
const ISSUE_VIEW_FIELDS =
  "number,state,title,body,labels,assignees,url,createdAt,stateReason,author,milestone,updatedAt,closedAt,isPinned,projectItems";

/** Registers the `issue-view` tool on the given MCP server. */
export function registerIssueViewTool(server: McpServer) {
  server.registerTool(
    "issue-view",
    {
      title: "Issue View",
      description:
        "Views an issue by number or URL. Returns structured data with state, labels, assignees, author, milestone, close reason, and body.",
      inputSchema: {
        number: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Issue number or URL"),
        comments: z
          .boolean()
          .optional()
          .describe("Include issue comments in output (-c/--comments)"),
        // S-gap P1: Add repo for cross-repo viewing
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: IssueViewResultSchema,
    },
    async ({ number, comments, repo, path, compact }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);

      const args = ["issue", "view", selector, "--json", ISSUE_VIEW_FIELDS];
      if (comments) args.push("--comments");
      if (repo) args.push("--repo", repo);
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh issue view failed: ${result.stderr}`);
      }

      const data = parseIssueView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatIssueView,
        compactIssueViewMap,
        formatIssueViewCompact,
        compact === false,
      );
    },
  );
}
