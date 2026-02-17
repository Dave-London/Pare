import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueClose } from "../lib/parsers.js";
import { formatIssueClose } from "../lib/formatters.js";
import { IssueCloseResultSchema } from "../schemas/index.js";

export function registerIssueCloseTool(server: McpServer) {
  server.registerTool(
    "issue-close",
    {
      title: "Issue Close",
      description:
        "Closes an issue with an optional comment and reason. Returns structured data with issue number, state, and URL.",
      inputSchema: {
        number: z.number().describe("Issue number"),
        comment: z.string().max(INPUT_LIMITS.STRING_MAX).optional().describe("Closing comment"),
        reason: z
          .enum(["completed", "not planned"])
          .optional()
          .describe('Close reason: "completed" or "not planned"'),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
      },
      outputSchema: IssueCloseResultSchema,
    },
    async ({ number, comment, reason, path }) => {
      const cwd = path || process.cwd();

      if (comment) {
        assertNoFlagInjection(comment, "comment");
      }

      const args = ["issue", "close", String(number)];
      if (comment) {
        args.push("--comment", comment);
      }
      if (reason) {
        args.push("--reason", reason);
      }

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh issue close failed: ${result.stderr}`);
      }

      const data = parseIssueClose(result.stdout, number);
      return dualOutput(data, formatIssueClose);
    },
  );
}
