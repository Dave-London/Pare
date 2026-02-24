import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrCreate } from "../lib/parsers.js";
import { formatPrCreate } from "../lib/formatters.js";
import { PrCreateResultSchema } from "../schemas/index.js";

function classifyPrCreateError(
  text: string,
): "base-branch-missing" | "no-commits" | "permission-denied" | "validation" | "unknown" {
  const lower = text.toLowerCase();
  if (/base .* not found|base branch .* does not exist/.test(lower)) return "base-branch-missing";
  if (/no commits between|must push the branch first|nothing to compare/.test(lower))
    return "no-commits";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/validation|invalid|required|unprocessable/.test(lower)) return "validation";
  return "unknown";
}

/** Registers the `pr-create` tool on the given MCP server. */
export function registerPrCreateTool(server: McpServer) {
  server.registerTool(
    "pr-create",
    {
      title: "PR Create",
      description: "Creates a new pull request. Returns structured data with PR number and URL.",
      inputSchema: {
        title: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Pull request title"),
        body: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Pull request body/description"),
        base: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Base branch (default: repo default branch)"),
        head: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Head branch (default: current branch)"),
        draft: z.boolean().optional().default(false).describe("Create as draft PR"),
        fill: z.boolean().optional().describe("Auto-fill title and body from commits (-f/--fill)"),
        fillFirst: z
          .boolean()
          .optional()
          .describe("Use first commit for title and body (--fill-first)"),
        fillVerbose: z
          .boolean()
          .optional()
          .describe("Use verbose commit messages for body (--fill-verbose)"),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview PR creation without executing (--dry-run)"),
        noMaintainerEdit: z
          .boolean()
          .optional()
          .describe("Disallow maintainer edits to the PR (--no-maintainer-edit)"),
        // S-gap P0: Add reviewer
        reviewer: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Request reviewers by username (-r/--reviewer)"),
        // S-gap P0: Add label
        label: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Add labels (-l/--label)"),
        // S-gap P0: Add assignee
        assignee: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Assign users (-a/--assignee)"),
        // S-gap P1: Add milestone
        milestone: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set milestone (-m/--milestone)"),
        // S-gap P1: Add project
        project: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Add to project (-p/--project)"),
        // S-gap P1: Add repo for cross-repo PR creation
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        // S-gap P2: Add template
        template: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Use PR template file (--template)"),
        path: repoPathInput,
      },
      outputSchema: PrCreateResultSchema,
    },
    async ({
      title,
      body,
      base,
      head,
      draft,
      fill,
      fillFirst,
      fillVerbose,
      dryRun,
      noMaintainerEdit,
      reviewer,
      label,
      assignee,
      milestone,
      project,
      repo,
      template,
      path,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(title, "title");
      if (base) assertNoFlagInjection(base, "base");
      if (head) assertNoFlagInjection(head, "head");
      if (milestone) assertNoFlagInjection(milestone, "milestone");
      if (project) assertNoFlagInjection(project, "project");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (template) assertNoFlagInjection(template, "template");
      if (reviewer) {
        for (const r of reviewer) {
          assertNoFlagInjection(r, "reviewer");
        }
      }
      if (label) {
        for (const l of label) {
          assertNoFlagInjection(l, "label");
        }
      }
      if (assignee) {
        for (const a of assignee) {
          assertNoFlagInjection(a, "assignee");
        }
      }

      const args = ["pr", "create", "--title", title, "--body-file", "-"];
      if (base) args.push("--base", base);
      if (head) args.push("--head", head);
      if (draft) args.push("--draft");
      if (fill) args.push("--fill");
      if (fillFirst) args.push("--fill-first");
      if (fillVerbose) args.push("--fill-verbose");
      if (dryRun) args.push("--dry-run");
      if (noMaintainerEdit) args.push("--no-maintainer-edit");
      // S-gap P0: Map reviewers
      if (reviewer && reviewer.length > 0) {
        for (const r of reviewer) {
          args.push("--reviewer", r);
        }
      }
      // S-gap P0: Map labels
      if (label && label.length > 0) {
        for (const l of label) {
          args.push("--label", l);
        }
      }
      // S-gap P0: Map assignees
      if (assignee && assignee.length > 0) {
        for (const a of assignee) {
          args.push("--assignee", a);
        }
      }
      // S-gap P1: Map milestone
      if (milestone) args.push("--milestone", milestone);
      // S-gap P1: Map project
      if (project) args.push("--project", project);
      // S-gap P1: Map repo
      if (repo) args.push("--repo", repo);
      // S-gap P2: Map template
      if (template) args.push("--template", template);

      const result = await ghCmd(args, { cwd, stdin: body });

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            number: 0,
            url: "",
            draft: !!draft,
            errorType: classifyPrCreateError(combined),
            errorMessage: combined || "gh pr create failed",
          },
          formatPrCreate,
        );
      }

      const data = parsePrCreate(result.stdout, {
        draft: !!draft,
      });
      return dualOutput(data, formatPrCreate);
    },
  );
}
