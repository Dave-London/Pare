import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueCreate } from "../lib/parsers.js";
import { formatIssueCreate } from "../lib/formatters.js";
import { IssueCreateResultSchema } from "../schemas/index.js";

export function registerIssueCreateTool(server: McpServer) {
  server.registerTool(
    "issue-create",
    {
      title: "Issue Create",
      description:
        "Creates a new issue. Returns structured data with issue number and URL. Use instead of running `gh issue create` in the terminal.",
      inputSchema: {
        title: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Issue title"),
        body: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Issue body/description"),
        labels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to apply"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: IssueCreateResultSchema,
    },
    async ({ title, body, labels, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(title, "title");
      if (labels) {
        for (const label of labels) {
          assertNoFlagInjection(label, "labels");
        }
      }

      const args = ["issue", "create", "--title", title, "--body", body];
      if (labels && labels.length > 0) {
        for (const label of labels) {
          args.push("--label", label);
        }
      }

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh issue create failed: ${result.stderr}`);
      }

      const data = parseIssueCreate(result.stdout);
      return dualOutput(data, formatIssueCreate);
    },
  );
}
