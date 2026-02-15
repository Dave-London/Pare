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
        "Submits a review on a pull request (approve, request-changes, or comment). Returns structured data with the review event and URL. Use instead of running `gh pr review` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
        event: z
          .enum(["approve", "request-changes", "comment"])
          .describe("Review type: approve, request-changes, or comment"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Review body (required for request-changes and comment)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: PrReviewResultSchema,
    },
    async ({ number, event, body, path }) => {
      const cwd = path || process.cwd();

      if (body) {
        assertNoFlagInjection(body, "body");
      }

      // request-changes and comment require a body
      if ((event === "request-changes" || event === "comment") && !body) {
        throw new Error(`Review body is required for "${event}" reviews.`);
      }

      const args = ["pr", "review", String(number), `--${event}`];

      // Pass body via stdin (--body-file -) to avoid shell escaping issues
      let stdin: string | undefined;
      if (body) {
        args.push("--body-file", "-");
        stdin = body;
      }

      const result = await ghCmd(args, { cwd, stdin });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr review failed: ${result.stderr}`);
      }

      const data = parsePrReview(result.stdout, number, event);
      return dualOutput(data, formatPrReview);
    },
  );
}
