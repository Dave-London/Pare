import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { ansibleGalaxyCmd } from "../lib/ansible-runner.js";
import {
  parseAnsibleGalaxyInstallOutput,
  parseAnsibleGalaxyListOutput,
} from "../lib/ansible-parsers.js";
import {
  formatAnsibleGalaxy,
  compactAnsibleGalaxyMap,
  formatAnsibleGalaxyCompact,
} from "../lib/ansible-formatters.js";
import { AnsibleGalaxyResultSchema } from "../schemas/ansible.js";

/** Registers the `ansible-galaxy` tool on the given MCP server. */
export function registerAnsibleGalaxyTool(server: McpServer) {
  server.registerTool(
    "ansible-galaxy",
    {
      title: "Ansible Galaxy",
      description:
        "Installs or lists Ansible collections and roles from Galaxy or a requirements file.",
      inputSchema: {
        action: z
          .enum(["collection-install", "role-install", "collection-list", "role-list"])
          .describe("Galaxy action to perform"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Collection or role name to install (e.g. community.general)"),
        requirements: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to requirements file (-r)"),
        force: z
          .boolean()
          .optional()
          .describe("Force overwriting an existing collection or role (--force)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: AnsibleGalaxyResultSchema,
    },
    async ({ action, name, requirements, force, path, compact }) => {
      const cwd = path || process.cwd();
      if (name) assertNoFlagInjection(name, "name");
      if (requirements) assertNoFlagInjection(requirements, "requirements");

      const args: string[] = [];

      switch (action) {
        case "collection-install": {
          args.push("collection", "install");
          if (name) args.push(name);
          if (requirements) args.push("-r", requirements);
          if (force) args.push("--force");
          const result = await ansibleGalaxyCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseAnsibleGalaxyInstallOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "collection-install",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatAnsibleGalaxy,
            compactAnsibleGalaxyMap,
            formatAnsibleGalaxyCompact,
            compact === false,
          );
        }

        case "role-install": {
          args.push("role", "install");
          if (name) args.push(name);
          if (requirements) args.push("-r", requirements);
          if (force) args.push("--force");
          const result = await ansibleGalaxyCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseAnsibleGalaxyInstallOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "role-install",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatAnsibleGalaxy,
            compactAnsibleGalaxyMap,
            formatAnsibleGalaxyCompact,
            compact === false,
          );
        }

        case "collection-list": {
          args.push("collection", "list");
          const result = await ansibleGalaxyCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseAnsibleGalaxyListOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "collection-list",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatAnsibleGalaxy,
            compactAnsibleGalaxyMap,
            formatAnsibleGalaxyCompact,
            compact === false,
          );
        }

        case "role-list": {
          args.push("role", "list");
          const result = await ansibleGalaxyCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseAnsibleGalaxyListOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "role-list",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatAnsibleGalaxy,
            compactAnsibleGalaxyMap,
            formatAnsibleGalaxyCompact,
            compact === false,
          );
        }
      }
    },
  );
}
