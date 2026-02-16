import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
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
        "Adds a comment to a pull request. Returns structured data with the comment URL. Use instead of running `gh pr comment` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
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
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: CommentResultSchema,
    },
    async ({ number, body, editLast, deleteLast, createIfNone, path }) => {
      const cwd = path || process.cwd();

      const args = ["pr", "comment", String(number), "--body-file", "-"];
      if (editLast) args.push("--edit-last");
      if (deleteLast) args.push("--delete-last");
      if (createIfNone) args.push("--create-if-none");

      const result = await ghCmd(args, { cwd, stdin: body });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr comment failed: ${result.stderr}`);
      }

      const data = parseComment(result.stdout);
      return dualOutput(data, formatComment);
    },
  );
}
