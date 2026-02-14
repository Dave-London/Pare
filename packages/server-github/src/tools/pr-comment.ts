import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseComment } from "../lib/parsers.js";
import { formatComment } from "../lib/formatters.js";
import { CommentResultSchema } from "../schemas/index.js";

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
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: CommentResultSchema,
    },
    async ({ number, body, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(body, "body");

      const args = ["pr", "comment", String(number), "--body-file", "-"];

      const result = await ghCmd(args, { cwd, stdin: body });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr comment failed: ${result.stderr}`);
      }

      const data = parseComment(result.stdout);
      return dualOutput(data, formatComment);
    },
  );
}
