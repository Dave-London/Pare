import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseExecOutput } from "../lib/parsers.js";
import { formatExec, compactExecMap, formatExecCompact } from "../lib/formatters.js";
import { DockerExecSchema } from "../schemas/index.js";

/** Registers the `exec` tool on the given MCP server. */
export function registerExecTool(server: McpServer) {
  server.registerTool(
    "exec",
    {
      title: "Docker Exec",
      description:
        "Executes arbitrary commands inside a running Docker container and returns structured output. WARNING: may execute untrusted code.",
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
        user: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Run command as a specific user (e.g., "root", "1000:1000")'),
        env: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Environment variables (e.g., ["KEY=VALUE"])'),
        envFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read environment variables from a file (--env-file)"),
        detach: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run command in the background (default: false)"),
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(600000)
          .optional()
          .describe("Command timeout in milliseconds (min 1000, max 600000)"),
        parseJson: z
          .boolean()
          .optional()
          .default(false)
          .describe("Parse stdout as JSON and return it in `json` when valid"),
        /** #108: Add output truncation with limit param. */
        limit: z
          .number()
          .optional()
          .describe(
            "Maximum number of characters to return in stdout. " +
              "Output exceeding this limit will be truncated and isTruncated set to true.",
          ),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Host working directory"),
        compact: compactInput,
      },
      outputSchema: DockerExecSchema,
    },
    async ({
      container,
      command,
      workdir,
      user,
      env,
      envFile,
      detach,
      timeout,
      parseJson,
      limit,
      path,
      compact,
    }) => {
      if (!command || command.length === 0) {
        throw new Error("command array must not be empty");
      }
      assertNoFlagInjection(container, "container");
      // Validate first element of command array (the binary name) to prevent flag injection.
      // Subsequent elements are intentionally unchecked as they are arguments to the command itself.
      assertNoFlagInjection(command[0], "command");
      if (workdir) assertNoFlagInjection(workdir, "workdir");
      if (user) assertNoFlagInjection(user, "user");
      if (envFile) assertNoFlagInjection(envFile, "envFile");

      const args = ["exec"];
      if (detach) args.push("-d");
      if (workdir) args.push("-w", workdir);
      if (user) args.push("-u", user);
      if (envFile) args.push("--env-file", envFile);
      for (const e of env ?? []) {
        assertNoFlagInjection(e, "env");
        args.push("-e", e);
      }
      args.push(container, ...command);

      const start = Date.now();
      let data;
      let rawOutput = "";
      try {
        const result = await docker(args, path, timeout);
        const duration = Math.round((Date.now() - start) / 100) / 10;

        // #108: Pass limit to parseExecOutput for output truncation
        data = parseExecOutput(result.stdout, result.stderr, result.exitCode, duration, limit, {
          parseJson,
        });
        rawOutput = `${result.stdout}\n${result.stderr}`;
      } catch (err) {
        const duration = Math.round((Date.now() - start) / 100) / 10;
        const message = err instanceof Error ? err.message : String(err);
        if (!/timed out/i.test(message)) {
          throw err;
        }
        data = parseExecOutput("", message, 124, duration, limit, { timedOut: true, parseJson });
        rawOutput = message;
      }
      return compactDualOutput(
        data,
        rawOutput,
        formatExec,
        compactExecMap,
        formatExecCompact,
        compact === false,
      );
    },
  );
}
