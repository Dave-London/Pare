import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseExecOutput } from "../lib/parsers.js";
import { formatExec, compactExecMap, formatExecCompact } from "../lib/formatters.js";
import { DockerExecSchema } from "../schemas/index.js";

export function registerExecTool(server: McpServer) {
  server.registerTool(
    "exec",
    {
      title: "Docker Exec",
      description:
        "Executes commands inside a running Docker container and returns structured output. WARNING: may execute untrusted code.",
      inputSchema: {
        container: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Container name or ID"),
        command: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe('Command to execute (e.g., ["ls", "-la"])'),
        workdir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory inside the container"),
        env: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Environment variables (e.g., ["KEY=VALUE"])'),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Host working directory"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerExecSchema,
    },
    async ({ container, command, workdir, env, path, compact }) => {
      if (!command || command.length === 0) {
        throw new Error("command array must not be empty");
      }
      assertNoFlagInjection(container, "container");
      assertNoFlagInjection(command[0], "command");
      if (workdir) assertNoFlagInjection(workdir, "workdir");
      // Validate first element of command array (the binary name) to prevent flag injection.
      // Subsequent elements are intentionally unchecked as they are arguments to the command itself.
      if (command.length > 0) {
        assertNoFlagInjection(command[0], "command");
      }

      const args = ["exec"];
      if (workdir) args.push("-w", workdir);
      for (const e of env ?? []) {
        assertNoFlagInjection(e, "env");
        args.push("-e", e);
      }
      args.push(container, ...command);

      const result = await docker(args, path);
      const data = parseExecOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatExec,
        compactExecMap,
        formatExecCompact,
        compact === false,
      );
    },
  );
}
