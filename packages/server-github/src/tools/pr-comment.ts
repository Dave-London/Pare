import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseComment } from "../lib/parsers.js";
import { formatComment } from "../lib/formatters.js";
import { CommentResultSchema } from "../schemas/index.js";

/** Registers the `pr-comment` tool on the given MCP server. */
export function registerPrCommentTool(server: McpServer) {
  server.registerTool(
    "pr-comment",
    {
      title: "PR Comment",
      description:
        "Adds, edits, or deletes a comment on a pull request. Returns structured data with the comment URL, operation type, comment ID, and body echo. Use instead of running `gh pr comment` in the terminal.",
      inputSchema: {
        // S-gap P1: Accept PR by number, URL, or branch via union
        number: z
          .union([z.number(), z.string().max(INPUT_LIMITS.STRING_MAX)])
          .describe("Pull request number, URL, or branch name"),
        body: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Comment text"),
        editLast: z
          .boolean()
          .optional()
          .describe("Edit the last comment instead of creating a new one (--edit-last)"),
        deleteLast: z.boolean().optional().describe("Delete the last comment (--delete-last)"),
        createIfNone: z
          .boolean()
          .optional()
          .describe(
            "When used with editLast, create a new comment if no existing comment exists (--create-if-none)",
          ),
        // S-gap P1: Add repo for cross-repo commenting
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
      },
      outputSchema: CommentResultSchema,
    },
    async ({ number, body, editLast, deleteLast, createIfNone, repo, path }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "comment", selector, "--body-file", "-"];
      if (editLast) args.push("--edit-last");
      if (deleteLast) args.push("--delete-last");
      if (createIfNone) args.push("--create-if-none");
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, { cwd, stdin: body });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr comment failed: ${result.stderr}`);
      }

      // S-gap: Determine operation type and pass context
      const operation = deleteLast ? "delete" : editLast ? "edit" : "create";
      const data = parseComment(result.stdout, {
        operation: operation as "create" | "edit" | "delete",
        prNumber: prNum,
        body,
      });
      return dualOutput(data, formatComment);
    },
  );
}
