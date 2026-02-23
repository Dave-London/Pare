import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { ansiblePlaybookCmd } from "../lib/ansible-runner.js";
import { parseAnsiblePlaybookOutput } from "../lib/ansible-parsers.js";
import {
  formatAnsiblePlaybook,
  compactAnsiblePlaybookMap,
  formatAnsiblePlaybookCompact,
} from "../lib/ansible-formatters.js";
import { AnsiblePlaybookResultSchema } from "../schemas/ansible.js";

/** Registers the `ansible-playbook` tool on the given MCP server. */
export function registerAnsiblePlaybookTool(server: McpServer) {
  server.registerTool(
    "ansible-playbook",
    {
      title: "Ansible Playbook",
      description:
        "Runs an Ansible playbook and returns structured play recap with per-host results.",
      inputSchema: {
        playbook: z.string().max(INPUT_LIMITS.PATH_MAX).describe("Path to playbook file"),
        inventory: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Inventory file or host list (-i)"),
        limit: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Limit to specific hosts or groups (--limit)"),
        tags: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Only run plays and tasks tagged with these values (--tags)"),
        skipTags: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Skip plays and tasks tagged with these values (--skip-tags)"),
        extraVars: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Extra variables as key=value or JSON string (-e)"),
        check: z.boolean().optional().describe("Run in check mode / dry-run (-C)"),
        syntaxCheck: z
          .boolean()
          .optional()
          .describe("Perform a syntax check on the playbook (--syntax-check)"),
        listTasks: z
          .boolean()
          .optional()
          .describe("List all tasks that would be executed (--list-tasks)"),
        listTags: z.boolean().optional().describe("List all available tags (--list-tags)"),
        forks: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Number of parallel processes (-f)"),
        verbose: z
          .number()
          .int()
          .min(0)
          .max(4)
          .optional()
          .describe("Verbosity level 0-4 (-v through -vvvv)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: AnsiblePlaybookResultSchema,
    },
    async ({
      playbook,
      inventory,
      limit,
      tags,
      skipTags,
      extraVars,
      check,
      syntaxCheck,
      listTasks,
      listTags,
      forks,
      verbose,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(playbook, "playbook");
      if (inventory) assertNoFlagInjection(inventory, "inventory");
      if (limit) assertNoFlagInjection(limit, "limit");

      const args: string[] = [playbook];

      if (inventory) args.push("-i", inventory);
      if (limit) args.push("--limit", limit);
      if (tags) args.push("--tags", tags);
      if (skipTags) args.push("--skip-tags", skipTags);
      if (extraVars) args.push("-e", extraVars);
      if (check) args.push("-C");
      if (syntaxCheck) args.push("--syntax-check");
      if (listTasks) args.push("--list-tasks");
      if (listTags) args.push("--list-tags");
      if (forks) args.push("-f", String(forks));
      if (verbose && verbose > 0) args.push(`-${"v".repeat(verbose)}`);

      const result = await ansiblePlaybookCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseAnsiblePlaybookOutput(result.stdout, result.stderr, result.exitCode, {
        syntaxCheck,
        listTasks,
        listTags,
      });

      return compactDualOutput(
        data,
        rawOutput,
        formatAnsiblePlaybook,
        compactAnsiblePlaybookMap,
        formatAnsiblePlaybookCompact,
        compact === false,
      );
    },
  );
}
