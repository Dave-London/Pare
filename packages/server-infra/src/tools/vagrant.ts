import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  assertAllowedByPolicy,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { vagrantCmd } from "../lib/vagrant-runner.js";
import {
  parseVagrantStatusOutput,
  parseVagrantGlobalStatusOutput,
  parseVagrantUpOutput,
  parseVagrantLifecycleOutput,
} from "../lib/vagrant-parsers.js";
import {
  formatVagrantStatus,
  compactVagrantStatusMap,
  formatVagrantStatusCompact,
  formatVagrantGlobalStatus,
  compactVagrantGlobalStatusMap,
  formatVagrantGlobalStatusCompact,
  formatVagrantUp,
  compactVagrantUpMap,
  formatVagrantUpCompact,
  formatVagrantLifecycle,
  compactVagrantLifecycleMap,
  formatVagrantLifecycleCompact,
} from "../lib/vagrant-formatters.js";
import { VagrantResultSchema } from "../schemas/vagrant.js";

/** Registers the `vagrant` tool on the given MCP server. */
export function registerVagrantTool(server: McpServer) {
  server.registerTool(
    "vagrant",
    {
      title: "Vagrant",
      description: "Manages Vagrant VMs: status, global-status, up, halt, destroy.",
      inputSchema: {
        action: z
          .enum(["status", "global-status", "up", "halt", "destroy"])
          .describe("Vagrant action to perform"),
        machine: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target machine name"),
        workDir: projectPathInput,
        compact: compactInput,
      },
      outputSchema: VagrantResultSchema,
    },
    async ({ action, machine, workDir, compact }) => {
      const cwd = workDir || process.cwd();
      if (machine) assertNoFlagInjection(machine, "machine");

      // destroy requires policy gate
      if (action === "destroy") {
        assertAllowedByPolicy("vagrant", "infra");
      }

      // Build args: always --machine-readable --no-color --no-tty
      const baseFlags = ["--machine-readable", "--no-color", "--no-tty"];

      switch (action) {
        case "status": {
          const args = ["status", ...baseFlags];
          if (machine) args.push(machine);
          const result = await vagrantCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseVagrantStatusOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatVagrantStatus,
            compactVagrantStatusMap,
            formatVagrantStatusCompact,
            compact === false,
          );
        }

        case "global-status": {
          const args = ["global-status", ...baseFlags];
          const result = await vagrantCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseVagrantGlobalStatusOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatVagrantGlobalStatus,
            compactVagrantGlobalStatusMap,
            formatVagrantGlobalStatusCompact,
            compact === false,
          );
        }

        case "up": {
          const args = ["up", ...baseFlags];
          if (machine) args.push(machine);
          const result = await vagrantCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseVagrantUpOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatVagrantUp,
            compactVagrantUpMap,
            formatVagrantUpCompact,
            compact === false,
          );
        }

        case "halt": {
          const args = ["halt", ...baseFlags];
          if (machine) args.push(machine);
          const result = await vagrantCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseVagrantLifecycleOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "halt",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatVagrantLifecycle,
            compactVagrantLifecycleMap,
            formatVagrantLifecycleCompact,
            compact === false,
          );
        }

        case "destroy": {
          const args = ["destroy", "-f", ...baseFlags];
          if (machine) args.push(machine);
          const result = await vagrantCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseVagrantLifecycleOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            "destroy",
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatVagrantLifecycle,
            compactVagrantLifecycleMap,
            formatVagrantLifecycleCompact,
            compact === false,
          );
        }
      }
    },
  );
}
