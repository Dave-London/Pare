import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueList } from "../lib/parsers.js";
import { formatIssueList, compactIssueListMap, formatIssueListCompact } from "../lib/formatters.js";
import { IssueListResultSchema } from "../schemas/index.js";

const ISSUE_LIST_FIELDS = "number,state,title,url,labels,assignees";

export function registerIssueListTool(server: McpServer) {
  server.registerTool(
    "issue-list",
    {
      title: "Issue List",
      description:
        "Lists issues with optional filters. Returns structured list with issue number, state, title, labels, and assignees. Use instead of running `gh issue list` in the terminal.",
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
        assignee: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by assignee username"),
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
            "Prefer compact output",
          ),
      },
      outputSchema: IssueListResultSchema,
    },
    async ({ state, limit, label, assignee, path, compact }) => {
      const cwd = path || process.cwd();

      if (label) assertNoFlagInjection(label, "label");
      if (assignee) assertNoFlagInjection(assignee, "assignee");

      const args = ["issue", "list", "--json", ISSUE_LIST_FIELDS, "--limit", String(limit)];
      if (state) args.push("--state", state);
      if (label) args.push("--label", label);
      if (assignee) args.push("--assignee", assignee);

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
