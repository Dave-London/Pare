import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueView } from "../lib/parsers.js";
import { formatIssueView, compactIssueViewMap, formatIssueViewCompact } from "../lib/formatters.js";
import { IssueViewResultSchema } from "../schemas/index.js";

const ISSUE_VIEW_FIELDS = "number,state,title,body,labels,assignees,url,createdAt";

/** Registers the `issue-view` tool on the given MCP server. */
export function registerIssueViewTool(server: McpServer) {
  server.registerTool(
    "issue-view",
    {
      title: "Issue View",
      description:
        "Views an issue by number. Returns structured data with state, labels, assignees, and body. Use instead of running `gh issue view` in the terminal.",
      inputSchema: {
        number: z.number().describe("Issue number"),
        comments: z
          .boolean()
          .optional()
          .describe("Include issue comments in output (-c/--comments)"),
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
      outputSchema: IssueViewResultSchema,
    },
    async ({ number, comments, path, compact }) => {
      const cwd = path || process.cwd();

      const args = ["issue", "view", String(number), "--json", ISSUE_VIEW_FIELDS];
      if (comments) args.push("--comments");
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
