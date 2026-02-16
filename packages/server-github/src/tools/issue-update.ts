import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseIssueUpdate } from "../lib/parsers.js";
import { formatIssueUpdate } from "../lib/formatters.js";
import { EditResultSchema } from "../schemas/index.js";

/** Registers the `issue-update` tool on the given MCP server. */
export function registerIssueUpdateTool(server: McpServer) {
  server.registerTool(
    "issue-update",
    {
      title: "Issue Update",
      description:
        "Updates issue metadata (title, body, labels, assignees, milestone, projects). Returns structured data with issue number and URL. Use instead of running `gh issue edit` in the terminal.",
      inputSchema: {
        // S-gap P1: Accept number or URL via union
        number: z
          .union([z.number(), z.string().max(INPUT_LIMITS.STRING_MAX)])
          .describe("Issue number or URL"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        title: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("New issue title"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("New issue body/description"),
        addLabels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to add"),
        removeLabels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to remove"),
        addAssignees: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Assignees to add"),
        removeAssignees: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Assignees to remove"),
        // S-gap P0: Add milestone
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set milestone on the issue (--milestone)"),
        removeMilestone: z
          .boolean()
          .optional()
          .describe("Remove the milestone from the issue (--remove-milestone)"),
        // S-gap P1: Add project management
        addProjects: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Projects to add (--add-project)"),
        removeProjects: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Projects to remove (--remove-project)"),
        // S-gap P1: Add repo for cross-repo updates
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
      },
      outputSchema: EditResultSchema,
    },
    async ({
      number,
      path,
      title,
      body,
      addLabels,
      removeLabels,
      addAssignees,
      removeAssignees,
      milestone,
      removeMilestone,
      addProjects,
      removeProjects,
      repo,
    }) => {
      const cwd = path || process.cwd();

      if (title) assertNoFlagInjection(title, "title");
      if (typeof number === "string") assertNoFlagInjection(number, "number");
      if (milestone) assertNoFlagInjection(milestone, "milestone");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (addLabels) {
        for (const label of addLabels) {
          assertNoFlagInjection(label, "addLabels");
        }
      }
      if (removeLabels) {
        for (const label of removeLabels) {
          assertNoFlagInjection(label, "removeLabels");
        }
      }
      if (addAssignees) {
        for (const assignee of addAssignees) {
          assertNoFlagInjection(assignee, "addAssignees");
        }
      }
      if (removeAssignees) {
        for (const assignee of removeAssignees) {
          assertNoFlagInjection(assignee, "removeAssignees");
        }
      }
      if (addProjects) {
        for (const project of addProjects) {
          assertNoFlagInjection(project, "addProjects");
        }
      }
      if (removeProjects) {
        for (const project of removeProjects) {
          assertNoFlagInjection(project, "removeProjects");
        }
      }

      const selector = String(number);
      const issueNum = typeof number === "number" ? number : 0;

      const args = ["issue", "edit", selector];
      if (title) args.push("--title", title);
      if (addLabels && addLabels.length > 0) {
        for (const label of addLabels) {
          args.push("--add-label", label);
        }
      }
      if (removeLabels && removeLabels.length > 0) {
        for (const label of removeLabels) {
          args.push("--remove-label", label);
        }
      }
      if (addAssignees && addAssignees.length > 0) {
        for (const assignee of addAssignees) {
          args.push("--add-assignee", assignee);
        }
      }
      if (removeAssignees && removeAssignees.length > 0) {
        for (const assignee of removeAssignees) {
          args.push("--remove-assignee", assignee);
        }
      }
      // S-gap P0: Map milestone
      if (milestone) args.push("--milestone", milestone);
      if (removeMilestone) args.push("--remove-milestone");
      // S-gap P1: Map projects
      if (addProjects && addProjects.length > 0) {
        for (const project of addProjects) {
          args.push("--add-project", project);
        }
      }
      if (removeProjects && removeProjects.length > 0) {
        for (const project of removeProjects) {
          args.push("--remove-project", project);
        }
      }
      if (repo) args.push("--repo", repo);
      if (body) {
        args.push("--body-file", "-");
      }

      const result = await ghCmd(args, body ? { cwd, stdin: body } : { cwd });

      if (result.exitCode !== 0) {
        throw new Error(`gh issue edit failed: ${result.stderr}`);
      }

      const data = parseIssueUpdate(result.stdout, issueNum);
      return dualOutput(data, formatIssueUpdate);
    },
  );
}
