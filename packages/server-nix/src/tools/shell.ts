import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { nixCmd } from "../lib/nix-runner.js";
import { parseShellOutput } from "../lib/parsers.js";
import { formatShell, compactShellMap, formatShellCompact } from "../lib/formatters.js";
import { NixShellResultSchema } from "../schemas/index.js";

/** Registers the `shell` tool on the given MCP server. */
export function registerShellTool(server: McpServer) {
  server.registerTool(
    "shell",
    {
      title: "Nix Shell",
      description:
        "Makes packages available in the environment and optionally runs a command. Returns stdout, stderr, exit code, and duration.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe(
            "Installable references for packages to make available (e.g. ['nixpkgs#jq', 'nixpkgs#curl'])",
          ),
        command: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Command to run with the packages available (uses --command)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixShellResultSchema,
    },
    async ({ packages, command, path, compact }) => {
      const cwd = path || process.cwd();
      for (const pkg of packages) {
        assertNoFlagInjection(pkg, "packages");
      }

      const cmdArgs = ["shell", ...packages];
      if (command) {
        cmdArgs.push("--command", "sh", "-c", command);
      }

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await nixCmd(cmdArgs, cwd);
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

      const data = parseShellOutput(
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
        formatShell,
        compactShellMap,
        formatShellCompact,
        compact === false,
      );
    },
  );
}
