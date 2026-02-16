import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrReview } from "../lib/parsers.js";
import { formatPrReview } from "../lib/formatters.js";
import { PrReviewResultSchema } from "../schemas/index.js";

/** Registers the `pr-review` tool on the given MCP server. */
export function registerPrReviewTool(server: McpServer) {
  server.registerTool(
    "pr-review",
    {
      title: "PR Review",
      description:
        "Submits a review on a pull request (approve, request-changes, or comment). Returns structured data with the review event, URL, and body echo. Use instead of running `gh pr review` in the terminal.",
      inputSchema: {
        // S-gap P0: Accept PR by number, URL, or branch via union
        number: z
          .union([z.number(), z.string().max(INPUT_LIMITS.STRING_MAX)])
          .describe("Pull request number, URL, or branch name"),
        event: z
          .enum(["approve", "request-changes", "comment"])
          .describe("Review type: approve, request-changes, or comment"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Review body (required for request-changes and comment)"),
        // S-gap P0: Add repo for cross-repo review
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        // S-gap P2: Add bodyFile for reading review body from file
        bodyFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read review body from file (--body-file). Mutually exclusive with body."),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: PrReviewResultSchema,
    },
    async ({ number, event, body, repo, bodyFile, path }) => {
      const cwd = path || process.cwd();

      if (body) {
        assertNoFlagInjection(body, "body");
      }
      if (repo) assertNoFlagInjection(repo, "repo");
      if (bodyFile) assertNoFlagInjection(bodyFile, "bodyFile");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      // request-changes and comment require a body
      if ((event === "request-changes" || event === "comment") && !body && !bodyFile) {
        throw new Error(`Review body is required for "${event}" reviews.`);
      }

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "review", selector, `--${event}`];
      if (repo) args.push("--repo", repo);

      // Pass body via stdin (--body-file -) to avoid shell escaping issues
      let stdin: string | undefined;
      if (body) {
        args.push("--body-file", "-");
        stdin = body;
      } else if (bodyFile) {
        // S-gap P2: Read body from file
        args.push("--body-file", bodyFile);
      }

      const result = await ghCmd(args, { cwd, stdin });

      // P1-gap #146: Classify errors instead of always throwing
      if (result.exitCode !== 0) {
        // Return structured error output with classification
        const data = parsePrReview(result.stdout, prNum, event, body, result.stderr);
        if (data.errorType && data.errorType !== "unknown") {
          // Return structured result with error classification
          return dualOutput(data, formatPrReview);
        }
        throw new Error(`gh pr review failed: ${result.stderr}`);
      }

      // P1-gap #145: Pass body for echo in output (event mapped to GitHub type)
      const data = parsePrReview(result.stdout, prNum, event, body);
      return dualOutput(data, formatPrReview);
    },
  );
}
