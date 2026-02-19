import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueCreate } from "../lib/parsers.js";
import { formatIssueCreate } from "../lib/formatters.js";
import { IssueCreateResultSchema } from "../schemas/index.js";

function classifyIssueCreateError(
  text: string,
): "validation" | "permission-denied" | "partial-created" | "unknown" {
  const lower = text.toLowerCase();
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/validation|invalid|required|unprocessable/.test(lower)) return "validation";
  return "unknown";
}

/** Registers the `issue-create` tool on the given MCP server. */
export function registerIssueCreateTool(server: McpServer) {
  server.registerTool(
    "issue-create",
    {
      title: "Issue Create",
      description:
        "Creates a new issue. Returns structured data with issue number, URL, and labels applied.",
      inputSchema: {
        title: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Issue title"),
        body: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Issue body/description"),
        labels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to apply"),
        // S-gap P0: Add assignees
        assignees: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Assignee usernames (-a/--assignee)"),
        // S-gap P0: Add milestone
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Milestone name or number (-m/--milestone)"),
        // S-gap P1: Add project
        project: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Project board name (-p/--project)"),
        // S-gap P1: Add template
        template: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Issue template file name (--template)"),
        // S-gap P1: Add repo for cross-repo creation
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: repoPathInput,
      },
      outputSchema: IssueCreateResultSchema,
    },
    async ({ title, body, labels, assignees, milestone, project, template, repo, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(title, "title");
      if (labels) {
        for (const label of labels) {
          assertNoFlagInjection(label, "labels");
        }
      }
      if (assignees) {
        for (const assignee of assignees) {
          assertNoFlagInjection(assignee, "assignees");
        }
      }
      if (milestone) assertNoFlagInjection(milestone, "milestone");
      if (project) assertNoFlagInjection(project, "project");
      if (template) assertNoFlagInjection(template, "template");
      if (repo) assertNoFlagInjection(repo, "repo");

      // Use --body-file - to pass body via stdin, avoiding shell escaping issues
      // for long bodies with special characters
      const args = ["issue", "create", "--title", title, "--body-file", "-"];
      if (labels && labels.length > 0) {
        for (const label of labels) {
          args.push("--label", label);
        }
      }
      // S-gap P0: Map assignees to --assignee flags
      if (assignees && assignees.length > 0) {
        for (const assignee of assignees) {
          args.push("--assignee", assignee);
        }
      }
      // S-gap P0: Map milestone to --milestone
      if (milestone) args.push("--milestone", milestone);
      // S-gap P1: Map project to --project
      if (project) args.push("--project", project);
      // S-gap P1: Map template to --template
      if (template) args.push("--template", template);
      // S-gap P1: Map repo to --repo
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, { cwd, stdin: body });

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        const partial = /https:\/\/github\.com\/[^\s]+\/issues\/\d+/.test(result.stdout);
        if (partial) {
          const partialData = parseIssueCreate(result.stdout, labels);
          return dualOutput(
            {
              ...partialData,
              partial: true,
              errorType: "partial-created" as const,
              errorMessage: combined,
            },
            formatIssueCreate,
          );
        }
        return dualOutput(
          {
            number: 0,
            url: "",
            labelsApplied: labels && labels.length > 0 ? labels : undefined,
            partial: false,
            errorType: classifyIssueCreateError(combined),
            errorMessage: combined || "gh issue create failed",
          },
          formatIssueCreate,
        );
      }

      // S-gap: Pass labels for echo in output
      const data = parseIssueCreate(result.stdout, labels);
      return dualOutput(data, formatIssueCreate);
    },
  );
}
