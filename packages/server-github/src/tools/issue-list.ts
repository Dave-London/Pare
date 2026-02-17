import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueList } from "../lib/parsers.js";
import { formatIssueList, compactIssueListMap, formatIssueListCompact } from "../lib/formatters.js";
import { IssueListResultSchema } from "../schemas/index.js";

// S-gap P1: Add author, createdAt, milestone to JSON fields
const ISSUE_LIST_FIELDS = "number,state,title,url,labels,assignees,author,createdAt,milestone";

/** Registers the `issue-list` tool on the given MCP server. */
export function registerIssueListTool(server: McpServer) {
  server.registerTool(
    "issue-list",
    {
      title: "Issue List",
      description:
        "Lists issues with optional filters. Returns structured list with issue number, state, title, labels, assignees, author, creation date, and milestone.",
      inputSchema: {
        state: z
          .enum(["open", "closed", "all"])
          .optional()
          .default("open")
          .describe("Filter by issue state (default: open)"),
        limit: z
          .number()
          .optional()
          .default(30)
          .describe("Maximum number of issues to return (default: 30)"),
        label: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Filter by label"),
        labels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Filter by multiple labels (each maps to --label)"),
        assignee: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by assignee username"),
        // S-gap P0: Add search param
        search: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("GitHub search syntax (-S/--search)"),
        // S-gap P0: Add author filter
        author: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by author username (-A/--author)"),
        // S-gap P1: Add milestone filter
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by milestone name or number (-m/--milestone)"),
        // S-gap P2: Add mention filter
        mention: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by mentioned user (--mention)"),
        // S-gap P2: Add app filter
        app: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by GitHub App (--app)"),
        // S-gap P1: Add repo for cross-repo listing
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: IssueListResultSchema,
    },
    async ({
      state,
      limit,
      label,
      labels,
      assignee,
      search,
      author,
      milestone,
      mention,
      app,
      repo,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (label) assertNoFlagInjection(label, "label");
      if (labels) {
        for (const l of labels) {
          assertNoFlagInjection(l, "labels");
        }
      }
      if (assignee) assertNoFlagInjection(assignee, "assignee");
      if (search) assertNoFlagInjection(search, "search");
      if (author) assertNoFlagInjection(author, "author");
      if (milestone) assertNoFlagInjection(milestone, "milestone");
      if (mention) assertNoFlagInjection(mention, "mention");
      if (app) assertNoFlagInjection(app, "app");
      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["issue", "list", "--json", ISSUE_LIST_FIELDS, "--limit", String(limit)];
      if (state) args.push("--state", state);
      if (label) args.push("--label", label);
      if (labels && labels.length > 0) {
        for (const l of labels) {
          args.push("--label", l);
        }
      }
      if (assignee) args.push("--assignee", assignee);
      if (search) args.push("--search", search);
      if (author) args.push("--author", author);
      if (milestone) args.push("--milestone", milestone);
      if (mention) args.push("--mention", mention);
      if (app) args.push("--app", app);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh issue list failed: ${result.stderr}`);
      }

      const data = parseIssueList(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatIssueList,
        compactIssueListMap,
        formatIssueListCompact,
        compact === false,
      );
    },
  );
}
