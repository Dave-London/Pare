import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrUpdate } from "../lib/parsers.js";
import { formatPrUpdate } from "../lib/formatters.js";
import { EditResultSchema } from "../schemas/index.js";

function classifyPrUpdateError(
  stderr: string,
): "not-found" | "permission-denied" | "validation" | "unknown" {
  const lower = stderr.toLowerCase();
  if (/not found|could not resolve|no pull request/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/validation|invalid|required|unprocessable/.test(lower)) return "validation";
  return "unknown";
}

/** Registers the `pr-update` tool on the given MCP server. */
export function registerPrUpdateTool(server: McpServer) {
  server.registerTool(
    "pr-update",
    {
      title: "PR Update",
      description:
        "Updates pull request metadata (title, body, labels, assignees, reviewers, milestone, base branch, projects). Returns structured data with PR number and URL.",
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        path: repoPathInput,
        title: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("New pull request title"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("New pull request body/description"),
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
        // S-gap P0: Add reviewer management
        addReviewers: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Add reviewers (--add-reviewer)"),
        removeReviewers: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Remove reviewers (--remove-reviewer)"),
        // S-gap P0: Add base branch change
        base: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Change base branch (-B/--base)"),
        // S-gap P1: Add milestone management
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set milestone (--milestone)"),
        removeMilestone: z.boolean().optional().describe("Remove milestone (--remove-milestone)"),
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
      addProjects,
      removeProjects,
      addReviewers,
      removeReviewers,
      base,
      milestone,
      removeMilestone,
      repo,
    }) => {
      const cwd = path || process.cwd();

      if (title) assertNoFlagInjection(title, "title");
      if (typeof number === "string") assertNoFlagInjection(number, "number");
      if (base) assertNoFlagInjection(base, "base");
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
      if (addReviewers) {
        for (const reviewer of addReviewers) {
          assertNoFlagInjection(reviewer, "addReviewers");
        }
      }
      if (removeReviewers) {
        for (const reviewer of removeReviewers) {
          assertNoFlagInjection(reviewer, "removeReviewers");
        }
      }

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;
      const updatedFields = [
        title ? "title" : undefined,
        body ? "body" : undefined,
        addLabels && addLabels.length > 0 ? "labels" : undefined,
        removeLabels && removeLabels.length > 0 ? "labels" : undefined,
        addAssignees && addAssignees.length > 0 ? "assignees" : undefined,
        removeAssignees && removeAssignees.length > 0 ? "assignees" : undefined,
        addProjects && addProjects.length > 0 ? "projects" : undefined,
        removeProjects && removeProjects.length > 0 ? "projects" : undefined,
        addReviewers && addReviewers.length > 0 ? "reviewers" : undefined,
        removeReviewers && removeReviewers.length > 0 ? "reviewers" : undefined,
        base ? "base" : undefined,
        milestone ? "milestone" : undefined,
        removeMilestone ? "milestone" : undefined,
      ].filter(Boolean) as string[];
      const operations = [
        addLabels && addLabels.length > 0 ? "add-label" : undefined,
        removeLabels && removeLabels.length > 0 ? "remove-label" : undefined,
        addAssignees && addAssignees.length > 0 ? "add-assignee" : undefined,
        removeAssignees && removeAssignees.length > 0 ? "remove-assignee" : undefined,
        addProjects && addProjects.length > 0 ? "add-project" : undefined,
        removeProjects && removeProjects.length > 0 ? "remove-project" : undefined,
        addReviewers && addReviewers.length > 0 ? "add-reviewer" : undefined,
        removeReviewers && removeReviewers.length > 0 ? "remove-reviewer" : undefined,
        base ? "set-base" : undefined,
        milestone ? "set-milestone" : undefined,
        removeMilestone ? "remove-milestone" : undefined,
      ].filter(Boolean) as string[];

      const args = ["pr", "edit", selector];
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
      // S-gap P0: Map reviewers
      if (addReviewers && addReviewers.length > 0) {
        for (const reviewer of addReviewers) {
          args.push("--add-reviewer", reviewer);
        }
      }
      if (removeReviewers && removeReviewers.length > 0) {
        for (const reviewer of removeReviewers) {
          args.push("--remove-reviewer", reviewer);
        }
      }
      // S-gap P0: Map base branch
      if (base) args.push("--base", base);
      // S-gap P1: Map milestone
      if (milestone) args.push("--milestone", milestone);
      if (removeMilestone) args.push("--remove-milestone");
      // S-gap P1: Map repo
      if (repo) args.push("--repo", repo);
      if (body) {
        args.push("--body-file", "-");
      }

      const result = await ghCmd(args, body ? { cwd, stdin: body } : { cwd });

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            number: prNum,
            url: "",
            updatedFields,
            operations,
            errorType: classifyPrUpdateError(combined),
            errorMessage: combined || "gh pr edit failed",
          },
          formatPrUpdate,
        );
      }

      const data = parsePrUpdate(result.stdout, prNum, updatedFields, operations);
      return dualOutput(data, formatPrUpdate);
    },
  );
}
