import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { sshKeyscanCmd } from "../lib/remote-runner.js";
import { parseSshKeyscanOutput } from "../lib/parsers.js";
import {
  formatSshKeyscan,
  compactSshKeyscanMap,
  formatSshKeyscanCompact,
} from "../lib/formatters.js";
import { SshKeyscanResultSchema } from "../schemas/index.js";

/** Registers the `ssh-keyscan` tool on the given MCP server. */
export function registerSshKeyscanTool(server: McpServer) {
  server.registerTool(
    "ssh-keyscan",
    {
      title: "SSH Keyscan",
      description:
        "Retrieves public host keys from a remote SSH server using `ssh-keyscan`. Useful for populating known_hosts or verifying host key fingerprints.",
      inputSchema: {
        host: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Remote host to scan for public keys (hostname or IP address)"),
        port: z.number().optional().describe("SSH port number (default: 22)"),
        keyType: z
          .enum(["rsa", "ecdsa", "ed25519"])
          .optional()
          .describe("Specific key type to request (default: all types)"),
        timeout: z
          .number()
          .optional()
          .describe("Timeout in seconds for the keyscan operation (default: 5)"),
        compact: compactInput,
      },
      outputSchema: SshKeyscanResultSchema,
    },
    async ({ host, port, keyType, timeout, compact }) => {
      assertNoFlagInjection(host, "host");

      const args: string[] = [];

      if (port !== undefined) args.push("-p", String(port));
      if (keyType) args.push("-t", keyType);
      if (timeout !== undefined) {
        args.push("-T", String(timeout));
      } else {
        args.push("-T", "5");
      }

      args.push(host);

      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await sshKeyscanCmd(args);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        result = { exitCode: 1, stdout: "", stderr: errMsg };
      }

      const data = parseSshKeyscanOutput(host, result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatSshKeyscan,
        compactSshKeyscanMap,
        formatSshKeyscanCompact,
        compact === false,
      );
    },
  );
}
