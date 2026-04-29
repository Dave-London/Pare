import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrReopen } from "../lib/parsers.js";
import { formatPrReopen } from "../lib/formatters.js";
import { PrReopenResultSchema } from "../schemas/index.js";

function classifyPrReopenError(
  text: string,
): "not-found" | "permission-denied" | "already-open" | "merged" | "unknown" {
  const lower = text.toLowerCase();
  if (/already open|already reopened/.test(lower)) return "already-open";
  if (/already merged|is merged|cannot reopen .* merged/.test(lower)) return "merged";
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `pr-reopen` tool on the given MCP server. */
export function registerPrReopenTool(server: McpServer) {
  server.registerTool(
    "pr-reopen",
    {
      title: "PR Reopen",
      description:
        "Reopens a previously closed pull request, optionally with a comment. Returns structured data with PR number, state, and URL.",
      annotations: { openWorldHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        comment: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Comment to post on reopen"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
      },
      outputSchema: PrReopenResultSchema,
    },
    async ({ number, comment, repo, path }) => {
      const cwd = path || process.cwd();

      if (comment) assertNoFlagInjection(comment, "comment");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "reopen", selector];
      if (comment) args.push("--comment", comment);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        const errorType = classifyPrReopenError(combined);

        if (errorType === "already-open") {
          const data = {
            ...parsePrReopen(result.stdout, prNum, result.stderr),
            errorType,
            errorMessage: combined.trim(),
          };
          return dualOutput(data, formatPrReopen);
        }

        const data = {
          number: prNum,
          state: "unknown",
          url: "",
          errorType,
          errorMessage: combined.trim(),
        };
        return dualOutput(data, formatPrReopen);
      }

      const data = parsePrReopen(result.stdout, prNum, result.stderr);
      return dualOutput(data, formatPrReopen);
    },
  );
}
