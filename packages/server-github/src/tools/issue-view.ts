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
import { parseIssueView } from "../lib/parsers.js";
import { formatIssueView, compactIssueViewMap, formatIssueViewCompact } from "../lib/formatters.js";
import { applyBodyCap, DEFAULT_MAX_BODY_LENGTH } from "../lib/body-truncate.js";
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
        "Views an issue by number or URL. Returns structured data with state, labels, assignees, author, milestone, close reason, and body. The `body` is capped at " +
        `${DEFAULT_MAX_BODY_LENGTH} characters (HTML <details> blocks collapsed to their <summary> first) and flagged with \`bodyTruncated\`/\`bodyLength\`; raise or lift the cap with \`maxBodyLength\` (0 = verbatim).`,
      annotations: { readOnlyHint: true, openWorldHint: true },
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
        path: repoPathInput,
        maxBodyLength: z.coerce
          .number()
          .int()
          .min(0)
          .max(1_000_000)
          .optional()
          .describe(
            `Maximum characters kept in the returned body (default ${DEFAULT_MAX_BODY_LENGTH}). Before capping, HTML <details> blocks are collapsed to their <summary> text. Set to 0 to disable both and return the body verbatim.`,
          ),
        compact: compactInput,
      },
      outputSchema: IssueViewResultSchema,
    },
    async ({ number, comments, repo, path, maxBodyLength, compact }) => {
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

      // Issue #1067: cap the body so a very long issue description cannot blow
      // the caller's token budget in full-schema mode.
      const data = applyBodyCap(parseIssueView(result.stdout), maxBodyLength);
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
