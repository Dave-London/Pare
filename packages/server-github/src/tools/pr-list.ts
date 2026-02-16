import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrList } from "../lib/parsers.js";
import { formatPrList, compactPrListMap, formatPrListCompact } from "../lib/formatters.js";
import { PrListResultSchema } from "../schemas/index.js";

// S-gap: Add labels, isDraft, baseRefName, reviewDecision, mergeable to JSON fields
const PR_LIST_FIELDS =
  "number,state,title,url,headRefName,baseRefName,author,labels,isDraft,reviewDecision,mergeable";

/** Registers the `pr-list` tool on the given MCP server. */
export function registerPrListTool(server: McpServer) {
  server.registerTool(
    "pr-list",
    {
      title: "PR List",
      description:
        "Lists pull requests with optional filters. Returns structured list with PR number, state, title, author, branch, labels, draft status, and merge readiness. Use instead of running `gh pr list` in the terminal.",
      inputSchema: {
        state: z
          .enum(["open", "closed", "merged", "all"])
          .optional()
          .default("open")
          .describe("Filter by PR state (default: open)"),
        limit: z
          .number()
          .optional()
          .default(30)
          .describe("Maximum number of PRs to return (default: 30)"),
        author: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by author username"),
        label: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Filter by label"),
        // S-gap P1: Add label as array for multiple label filtering
        labels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Filter by multiple labels (each maps to --label)"),
        draft: z.boolean().optional().describe("Filter by draft status (-d/--draft)"),
        // S-gap P0: Add base branch filter
        base: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by base branch (-B/--base)"),
        // S-gap P0: Add head branch filter
        head: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by head branch (-H/--head)"),
        // S-gap P1: Add assignee filter
        assignee: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by assignee username (-a/--assignee)"),
        // S-gap P1: Add search
        search: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("GitHub search syntax (-S/--search)"),
        // S-gap P1: Add repo for cross-repo listing
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        // S-gap P2: Add app filter
        app: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by GitHub App (--app)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PrListResultSchema,
    },
    async ({
      state,
      limit,
      author,
      label,
      labels,
      draft,
      base,
      head,
      assignee,
      search,
      repo,
      app,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (author) assertNoFlagInjection(author, "author");
      if (label) assertNoFlagInjection(label, "label");
      if (labels) {
        for (const l of labels) {
          assertNoFlagInjection(l, "labels");
        }
      }
      if (base) assertNoFlagInjection(base, "base");
      if (head) assertNoFlagInjection(head, "head");
      if (assignee) assertNoFlagInjection(assignee, "assignee");
      if (search) assertNoFlagInjection(search, "search");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (app) assertNoFlagInjection(app, "app");

      const args = ["pr", "list", "--json", PR_LIST_FIELDS, "--limit", String(limit)];
      if (state) args.push("--state", state);
      if (author) args.push("--author", author);
      if (label) args.push("--label", label);
      if (labels && labels.length > 0) {
        for (const l of labels) {
          args.push("--label", l);
        }
      }
      if (draft) args.push("--draft");
      if (base) args.push("--base", base);
      if (head) args.push("--head", head);
      if (assignee) args.push("--assignee", assignee);
      if (search) args.push("--search", search);
      if (repo) args.push("--repo", repo);
      if (app) args.push("--app", app);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr list failed: ${result.stderr}`);
      }

      const data = parsePrList(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPrList,
        compactPrListMap,
        formatPrListCompact,
        compact === false,
      );
    },
  );
}
