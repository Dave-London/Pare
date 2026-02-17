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
        "Updates issue metadata (title, body, labels, assignees, milestone, projects). " +
        "All fields except `number` are optional — only supply the fields you want to change. " +
        "For list fields (labels, assignees, projects), use `add*` to append and `remove*` to " +
        "delete specific items without affecting others. " +
        "Returns structured data with issue number and URL.",
      inputSchema: {
        // ── Target ──────────────────────────────────────────────────
        /** Issue number (integer) or full GitHub issue URL. */
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Issue number or full GitHub issue URL to update"),
        /** Repository path on disk. Defaults to cwd. */
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),

        // ── Content fields ──────────────────────────────────────────
        /** Replace the issue title entirely. */
        title: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("New issue title (replaces existing)"),
        /** Replace the issue body entirely. Passed via stdin to avoid shell escaping issues. */
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("New issue body/description (replaces existing, sent via stdin)"),

        // ── Labels (additive/subtractive) ───────────────────────────
        /** Labels to add to the issue. Does not remove existing labels. */
        addLabels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to add (preserves existing labels)"),
        /** Labels to remove from the issue. Ignores labels not present. */
        removeLabels: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Labels to remove (ignores labels not currently set)"),

        // ── Assignees (additive/subtractive) ────────────────────────
        /** Assignees to add. Does not remove existing assignees. */
        addAssignees: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("GitHub usernames to assign (preserves existing assignees)"),
        /** Assignees to remove. Ignores users not currently assigned. */
        removeAssignees: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("GitHub usernames to unassign (ignores users not assigned)"),

        // ── Milestone ───────────────────────────────────────────────
        /** Set the milestone. Use `removeMilestone` to clear it instead. */
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Set milestone by name or number (--milestone). Mutually exclusive with removeMilestone.",
          ),
        /** Remove the current milestone from the issue. */
        removeMilestone: z
          .boolean()
          .optional()
          .describe(
            "Remove the milestone from the issue (--remove-milestone). Mutually exclusive with milestone.",
          ),

        // ── Projects (additive/subtractive) ─────────────────────────
        /** Projects to add. Does not remove existing project associations. */
        addProjects: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Project board names to add (--add-project)"),
        /** Projects to remove. Ignores projects not currently associated. */
        removeProjects: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Project board names to remove (--remove-project)"),

        // ── Cross-repo ──────────────────────────────────────────────
        /** Target a different repository than the one at `path`. */
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
      // Milestone: set or remove (mutually exclusive)
      if (milestone) args.push("--milestone", milestone);
      if (removeMilestone) args.push("--remove-milestone");
      // Projects: add or remove
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
