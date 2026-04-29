import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrReady } from "../lib/parsers.js";
import { formatPrReady } from "../lib/formatters.js";
import { PrReadyResultSchema } from "../schemas/index.js";

function classifyPrReadyError(
  text: string,
  undo?: boolean,
): "not-found" | "permission-denied" | "already-ready" | "already-draft" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  // gh prints variants like "Pull request #N is already 'ready for review'" / "is already a draft"
  if (/already .*ready/.test(lower) || (!undo && /not.*draft|cannot.*ready/.test(lower))) {
    return "already-ready";
  }
  if (/already .*draft/.test(lower) || (undo && /already.*draft/.test(lower))) {
    return "already-draft";
  }
  return "unknown";
}

/** Registers the `pr-ready` tool on the given MCP server. */
export function registerPrReadyTool(server: McpServer) {
  server.registerTool(
    "pr-ready",
    {
      title: "PR Ready",
      description:
        "Marks a pull request as ready for review (or converts it back to draft when undo=true). Returns structured data with PR number, state, URL, and resulting draft status.",
      annotations: { openWorldHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        undo: z.coerce
          .boolean()
          .optional()
          .describe("Convert PR back to draft instead of marking ready (--undo)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
      },
      outputSchema: PrReadyResultSchema,
    },
    async ({ number, undo, repo, path }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "ready", selector];
      if (undo) args.push("--undo");
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`;
        const errorType = classifyPrReadyError(combined, undo);

        const data = {
          number: prNum,
          state: "unknown",
          url: "",
          isDraft: !!undo,
          errorType,
          errorMessage: combined.trim(),
        };
        return dualOutput(data, formatPrReady);
      }

      const data = parsePrReady(result.stdout, prNum, undo);
      return dualOutput(data, formatPrReady);
    },
  );
}
