import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { ansibleInventoryCmd } from "../lib/ansible-runner.js";
import {
  parseAnsibleInventoryListOutput,
  parseAnsibleInventoryGraphOutput,
  parseAnsibleInventoryHostOutput,
} from "../lib/ansible-parsers.js";
import {
  formatAnsibleInventory,
  compactAnsibleInventoryMap,
  formatAnsibleInventoryCompact,
} from "../lib/ansible-formatters.js";
import { AnsibleInventoryResultSchema } from "../schemas/ansible.js";

/** Registers the `ansible-inventory` tool on the given MCP server. */
export function registerAnsibleInventoryTool(server: McpServer) {
  server.registerTool(
    "ansible-inventory",
    {
      title: "Ansible Inventory",
      description:
        "Queries Ansible inventory for hosts, groups, and variables. Returns structured JSON for --list or tree text for --graph.",
      inputSchema: {
        inventory: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Inventory file or host list (-i)"),
        graph: z
          .boolean()
          .optional()
          .describe("Show inventory graph (--graph) instead of JSON list"),
        host: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Show variables for a specific host (--host)"),
        vars: z.boolean().optional().describe("Show host variables in graph mode (--vars)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: AnsibleInventoryResultSchema,
    },
    async ({ inventory, graph, host, vars, path, compact }) => {
      const cwd = path || process.cwd();
      if (inventory) assertNoFlagInjection(inventory, "inventory");
      if (host) assertNoFlagInjection(host, "host");

      const args: string[] = [];
      if (inventory) args.push("-i", inventory);

      let data;
      if (host) {
        // --host mode: returns vars for a single host
        args.push("--host", host);
        const result = await ansibleInventoryCmd(args, cwd);
        const rawOutput = (result.stdout + "\n" + result.stderr).trim();
        data = parseAnsibleInventoryHostOutput(result.stdout, result.stderr, result.exitCode, host);
        return compactDualOutput(
          data,
          rawOutput,
          formatAnsibleInventory,
          compactAnsibleInventoryMap,
          formatAnsibleInventoryCompact,
          compact === false,
        );
      } else if (graph) {
        // --graph mode: returns tree-formatted text
        args.push("--graph");
        if (vars) args.push("--vars");
        const result = await ansibleInventoryCmd(args, cwd);
        const rawOutput = (result.stdout + "\n" + result.stderr).trim();
        data = parseAnsibleInventoryGraphOutput(result.stdout, result.stderr, result.exitCode);
        return compactDualOutput(
          data,
          rawOutput,
          formatAnsibleInventory,
          compactAnsibleInventoryMap,
          formatAnsibleInventoryCompact,
          compact === false,
        );
      } else {
        // --list mode (default): Ansible outputs JSON natively
        args.push("--list");
        const result = await ansibleInventoryCmd(args, cwd);
        const rawOutput = (result.stdout + "\n" + result.stderr).trim();
        data = parseAnsibleInventoryListOutput(result.stdout, result.stderr, result.exitCode);
        return compactDualOutput(
          data,
          rawOutput,
          formatAnsibleInventory,
          compactAnsibleInventoryMap,
          formatAnsibleInventoryCompact,
          compact === false,
        );
      }
    },
  );
}
