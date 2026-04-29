import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrClose } from "../lib/parsers.js";
import { formatPrClose } from "../lib/formatters.js";
import { PrCloseResultSchema } from "../schemas/index.js";

function classifyPrCloseError(
  text: string,
): "not-found" | "permission-denied" | "already-closed" | "merged" | "unknown" {
  const lower = text.toLowerCase();
  if (/already closed|already been closed/.test(lower)) return "already-closed";
  if (/already merged|is merged/.test(lower)) return "merged";
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `pr-close` tool on the given MCP server. */
export function registerPrCloseTool(server: McpServer) {
  server.registerTool(
    "pr-close",
    {
      title: "PR Close",
      description:
        "Closes a pull request with an optional comment and optional branch deletion. Returns structured data with PR number, state, URL, and deleted-branch flag.",
      annotations: { openWorldHint: true, destructiveHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        comment: z.string().max(INPUT_LIMITS.STRING_MAX).optional().describe("Closing comment"),
        deleteBranch: z.coerce
          .boolean()
          .optional()
          .describe("Delete the head branch after closing (--delete-branch)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
      },
      outputSchema: PrCloseResultSchema,
    },
    async ({ number, comment, deleteBranch, repo, path }) => {
      const cwd = path || process.cwd();

      if (comment) assertNoFlagInjection(comment, "comment");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "close", selector];
      if (comment) args.push("--comment", comment);
      if (deleteBranch) args.push("--delete-branch");
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        const errorType = classifyPrCloseError(combined);

        if (errorType === "already-closed") {
          const data = {
            ...parsePrClose(result.stdout, prNum, deleteBranch, result.stderr),
            errorType,
            errorMessage: combined.trim(),
          };
          return dualOutput(data, formatPrClose);
        }

        const data = {
          number: prNum,
          state: "unknown",
          url: "",
          deletedBranch: undefined,
          errorType,
          errorMessage: combined.trim(),
        };
        return dualOutput(data, formatPrClose);
      }

      const data = parsePrClose(result.stdout, prNum, deleteBranch, result.stderr);
      return dualOutput(data, formatPrClose);
    },
  );
}
