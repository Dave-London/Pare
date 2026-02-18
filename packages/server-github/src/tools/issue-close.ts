import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueClose } from "../lib/parsers.js";
import { formatIssueClose } from "../lib/formatters.js";
import { IssueCloseResultSchema } from "../schemas/index.js";

function classifyIssueCloseError(
  text: string,
): "not-found" | "permission-denied" | "already-closed" | "unknown" {
  const lower = text.toLowerCase();
  if (/already closed|already been closed/.test(lower)) return "already-closed";
  if (/not found|could not resolve|no issue/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `issue-close` tool on the given MCP server. */
export function registerIssueCloseTool(server: McpServer) {
  server.registerTool(
    "issue-close",
    {
      title: "Issue Close",
      description:
        "Closes an issue with an optional comment and reason. Returns structured data with issue number, state, URL, reason, and comment URL.",
      inputSchema: {
        number: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Issue number or URL"),
        comment: z.string().max(INPUT_LIMITS.STRING_MAX).optional().describe("Closing comment"),
        reason: z
          .enum(["completed", "not planned"])
          .optional()
          .describe('Close reason: "completed" or "not planned"'),
        // S-gap P1: Add repo for cross-repo close
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
      },
      outputSchema: IssueCloseResultSchema,
    },
    async ({ number, comment, reason, repo, path }) => {
      const cwd = path || process.cwd();

      if (comment) {
        assertNoFlagInjection(comment, "comment");
      }
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const issueNum = typeof number === "number" ? number : 0;

      const args = ["issue", "close", selector];
      // Note: gh issue close only supports --comment, not --comment-file or stdin.
      // This is a gh CLI limitation — no stdin alternative exists for closing comments.
      if (comment) {
        args.push("--comment", comment);
      }
      if (reason) {
        args.push("--reason", reason);
      }
      if (repo) {
        args.push("--repo", repo);
      }

      const result = await ghCmd(args, cwd);

      // P1-gap #144: Detect already-closed issues instead of throwing
      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        const isAlreadyClosed =
          /already closed/i.test(combined) ||
          /issue .* is already closed/i.test(combined) ||
          /already been closed/i.test(combined);

        if (isAlreadyClosed) {
          // Return structured output with alreadyClosed flag
          const data = {
            ...parseIssueClose(result.stdout, issueNum, reason, comment, result.stderr),
            errorType: "already-closed" as const,
            errorMessage: combined.trim(),
          };
          return dualOutput(data, formatIssueClose);
        }
        const data = {
          number: issueNum,
          state: "open",
          url: "",
          reason: reason ?? undefined,
          commentUrl: undefined,
          errorType: classifyIssueCloseError(combined),
          errorMessage: combined.trim(),
        };
        return dualOutput(data, formatIssueClose);
      }

      // S-gap: Pass reason, comment, and stderr for echo in output
      const data = parseIssueClose(result.stdout, issueNum, reason, comment, result.stderr);
      return dualOutput(data, formatIssueClose);
    },
  );
}
