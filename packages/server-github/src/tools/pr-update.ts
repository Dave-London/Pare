import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrUpdate } from "../lib/parsers.js";
import { formatPrUpdate } from "../lib/formatters.js";
import { EditResultSchema } from "../schemas/index.js";

/** Registers the `pr-update` tool on the given MCP server. */
export function registerPrUpdateTool(server: McpServer) {
  server.registerTool(
    "pr-update",
    {
      title: "PR Update",
      description:
        "Updates pull request metadata (title, body, labels, assignees). Returns structured data with PR number and URL. Use instead of running `gh pr edit` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
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
    }) => {
      const cwd = path || process.cwd();

      if (title) assertNoFlagInjection(title, "title");
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

      const args = ["pr", "edit", String(number)];
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
      if (body) {
        args.push("--body-file", "-");
      }

      const result = await ghCmd(args, body ? { cwd, stdin: body } : { cwd });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr edit failed: ${result.stderr}`);
      }

      const data = parsePrUpdate(result.stdout, number);
      return dualOutput(data, formatPrUpdate);
    },
  );
}
