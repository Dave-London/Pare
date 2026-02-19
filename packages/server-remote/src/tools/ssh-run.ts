import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { sshCmd } from "../lib/remote-runner.js";
import { parseSshRunOutput } from "../lib/parsers.js";
import { formatSshRun, compactSshRunMap, formatSshRunCompact } from "../lib/formatters.js";
import { SshRunResultSchema } from "../schemas/index.js";

/** Registers the `ssh-run` tool on the given MCP server. */
export function registerSshRunTool(server: McpServer) {
  server.registerTool(
    "ssh-run",
    {
      title: "SSH Run Command",
      description:
        "Executes a command on a remote host via SSH. WARNING: This runs commands on a remote machine. Ensure the host and command are correct before executing. Returns structured output with stdout, stderr, exit code, and duration.",
      inputSchema: {
        host: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Remote host to connect to (hostname or IP address)"),
        user: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("SSH username (if not specified, uses SSH config default)"),
        command: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Command to execute on the remote host"),
        port: z.number().optional().describe("SSH port number (default: 22)"),
        identityFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to SSH private key file"),
        options: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional SSH options as -o key=value pairs (e.g. StrictHostKeyChecking=no)"),
        compact: compactInput,
      },
      outputSchema: SshRunResultSchema,
    },
    async ({ host, user, command, port, identityFile, options, compact }) => {
      assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");
      if (identityFile) assertNoFlagInjection(identityFile, "identityFile");

      const args: string[] = [];

      // Add options
      for (const opt of options || []) {
        assertNoFlagInjection(opt, "options");
        args.push("-o", opt);
      }

      if (port !== undefined) args.push("-p", String(port));
      if (identityFile) args.push("-i", identityFile);

      // Build destination
      const destination = user ? `${user}@${host}` : host;
      args.push(destination, command);

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await sshCmd(args);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseSshRunOutput(
        host,
        user,
        command,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatSshRun,
        compactSshRunMap,
        formatSshRunCompact,
        compact === false,
      );
    },
  );
}
