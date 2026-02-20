import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { sshCmd } from "../lib/remote-runner.js";
import { parseSshTestOutput } from "../lib/parsers.js";
import { formatSshTest, compactSshTestMap, formatSshTestCompact } from "../lib/formatters.js";
import { SshTestResultSchema } from "../schemas/index.js";

/** Registers the `ssh-test` tool on the given MCP server. */
export function registerSshTestTool(server: McpServer) {
  server.registerTool(
    "ssh-test",
    {
      title: "SSH Test Connection",
      description:
        "Tests SSH connectivity to a remote host using `ssh -T`. Returns whether the host is reachable and any banner message.",
      inputSchema: {
        host: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Remote host to test connectivity to (hostname or IP address)"),
        user: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("SSH username (if not specified, uses SSH config default)"),
        port: z.number().optional().describe("SSH port number (default: 22)"),
        identityFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to SSH private key file"),
        connectTimeout: z
          .number()
          .optional()
          .describe("Connection timeout in seconds (default: 10)"),
        compact: compactInput,
      },
      outputSchema: SshTestResultSchema,
    },
    async ({ host, user, port, identityFile, connectTimeout, compact }) => {
      assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");
      if (identityFile) assertNoFlagInjection(identityFile, "identityFile");

      const args: string[] = ["-T"];

      if (port !== undefined) args.push("-p", String(port));
      if (identityFile) args.push("-i", identityFile);
      if (connectTimeout !== undefined) {
        args.push("-o", `ConnectTimeout=${connectTimeout}`);
      } else {
        args.push("-o", "ConnectTimeout=10");
      }

      // Disable interactive prompts
      args.push("-o", "BatchMode=yes");

      const destination = user ? `${user}@${host}` : host;
      args.push(destination);

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await sshCmd(args);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        result = { exitCode: 255, stdout: "", stderr: errMsg };
      }
      const duration = Date.now() - start;

      const data = parseSshTestOutput(
        host,
        user,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatSshTest,
        compactSshTestMap,
        formatSshTestCompact,
        compact === false,
      );
    },
  );
}
