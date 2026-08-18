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
import { parsePrView } from "../lib/parsers.js";
import { formatPrView, compactPrViewMap, formatPrViewCompact } from "../lib/formatters.js";
import { applyBodyCap, truncateBody, DEFAULT_MAX_BODY_LENGTH } from "../lib/body-truncate.js";
import { PrViewResultSchema } from "../schemas/index.js";

// S-gap: Add author, labels, isDraft, assignees, createdAt, updatedAt, milestone, projectItems
// P1-gap #147: Added reviews to field list
const PR_VIEW_FIELDS =
  "number,state,title,body,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName,additions,deletions,changedFiles,author,labels,isDraft,assignees,createdAt,updatedAt,milestone,projectItems,reviews,commits";

/** Registers the `pr-view` tool on the given MCP server. */
export function registerPrViewTool(server: McpServer) {
  server.registerTool(
    "pr-view",
    {
      title: "PR View",
      description:
        "Views a pull request by number, URL, or branch. Returns structured data with state, checks, review decision, diff stats, author, labels, draft status, assignees, milestone, and timestamps. The `body` is capped at " +
        `${DEFAULT_MAX_BODY_LENGTH} characters (HTML <details> blocks collapsed to their <summary> first) and flagged with \`bodyTruncated\`/\`bodyLength\`; raise or lift the cap with \`maxBodyLength\` (0 = verbatim).`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        comments: z.coerce
          .boolean()
          .optional()
          .describe("Include PR comments in output (-c/--comments)"),
        // S-gap P1: Add repo for cross-repo inspection
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
      outputSchema: PrViewResultSchema,
    },
    async ({ number, comments, repo, path, maxBodyLength, compact }) => {
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

      // Issue #1067: cap the body (and each review body) so a Dependabot-sized
      // changelog cannot blow the caller's token budget in full-schema mode.
      const data = applyBodyCap(parsePrView(result.stdout), maxBodyLength);
      if (data.reviews) {
        data.reviews = data.reviews.map((r) => {
          if (!r.body) return r;
          const { body, bodyTruncated } = truncateBody(r.body, maxBodyLength);
          return bodyTruncated ? { ...r, body, bodyTruncated } : r;
        });
      }
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
