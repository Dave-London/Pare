import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrMerge } from "../lib/parsers.js";
import { formatPrMerge } from "../lib/formatters.js";
import { PrMergeResultSchema } from "../schemas/index.js";

function classifyPrMergeError(
  text: string,
): "blocked-checks" | "merge-conflict" | "permission-denied" | "already-merged" | "unknown" {
  const lower = text.toLowerCase();
  if (/already merged|is already merged/.test(lower)) return "already-merged";
  if (/merge conflict|conflicts/.test(lower)) return "merge-conflict";
  if (/checks? (have )?not passed|required status check/.test(lower)) return "blocked-checks";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `pr-merge` tool on the given MCP server. */
export function registerPrMergeTool(server: McpServer) {
  server.registerTool(
    "pr-merge",
    {
      title: "PR Merge",
      description:
        "Merges a pull request by number, URL, or branch. Returns structured data with merge status, method, URL, and branch deletion status. Use instead of running `gh pr merge` in the terminal.",
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        method: z
          .enum(["squash", "merge", "rebase"])
          .optional()
          .default("squash")
          .describe("Merge method (default: squash)"),
        deleteBranch: z.boolean().optional().default(false).describe("Delete branch after merge"),
        admin: z
          .boolean()
          .optional()
          .default(false)
          .describe("Bypass branch protection rules (--admin)"),
        auto: z
          .boolean()
          .optional()
          .describe("Enable auto-merge when requirements are met (--auto)"),
        disableAuto: z
          .boolean()
          .optional()
          .describe("Disable auto-merge for this PR (--disable-auto)"),
        subject: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Commit subject for merge commit (--subject)"),
        commitBody: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Commit body for merge commit (--body)"),
        authorEmail: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Author email for merge commit (--author-email)"),
        // S-gap P0: Add matchHeadCommit for safety check
        matchHeadCommit: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Safety check: only merge if HEAD SHA matches this value (--match-head-commit)",
          ),
        // S-gap P1: Add repo for cross-repo merging
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
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
      outputSchema: PrMergeResultSchema,
    },
    async ({
      number,
      method,
      deleteBranch,
      admin,
      auto,
      disableAuto,
      subject,
      commitBody,
      authorEmail,
      matchHeadCommit,
      repo,
      path,
    }) => {
      const cwd = path || process.cwd();

      if (subject) assertNoFlagInjection(subject, "subject");
      if (authorEmail) assertNoFlagInjection(authorEmail, "authorEmail");
      if (matchHeadCommit) assertNoFlagInjection(matchHeadCommit, "matchHeadCommit");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "merge", selector, `--${method}`];
      if (deleteBranch) args.push("--delete-branch");
      if (admin) args.push("--admin");
      if (auto) args.push("--auto");
      if (disableAuto) args.push("--disable-auto");
      if (subject) args.push("--subject", subject);
      if (commitBody) args.push("--body", commitBody);
      if (authorEmail) args.push("--author-email", authorEmail);
      if (matchHeadCommit) args.push("--match-head-commit", matchHeadCommit);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            number: prNum,
            merged: false,
            method: method!,
            url: "",
            state: disableAuto ? "auto-merge-disabled" : auto ? "auto-merge-enabled" : undefined,
            errorType: classifyPrMergeError(combined),
            errorMessage: combined || "gh pr merge failed",
          },
          formatPrMerge,
        );
      }

      const data = parsePrMerge(result.stdout, prNum, method!, !!deleteBranch, auto, disableAuto);
      return dualOutput(data, formatPrMerge);
    },
  );
}
