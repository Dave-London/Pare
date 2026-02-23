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
import { parseDevelopOutput } from "../lib/parsers.js";
import { formatDevelop, compactDevelopMap, formatDevelopCompact } from "../lib/formatters.js";
import { NixDevelopResultSchema } from "../schemas/index.js";

/** Registers the `develop` tool on the given MCP server. */
export function registerDevelopTool(server: McpServer) {
  server.registerTool(
    "develop",
    {
      title: "Nix Develop",
      description:
        "Enters or queries a Nix dev shell. When a command is provided, runs it inside the dev shell and returns the result.",
      inputSchema: {
        installable: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .default(".")
          .describe("Installable reference for the dev shell (e.g. '.#devShell')"),
        command: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Command to run inside the dev shell (uses --command)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixDevelopResultSchema,
    },
    async ({ installable, command, path, compact }) => {
      const cwd = path || process.cwd();
      if (installable) assertNoFlagInjection(installable, "installable");

      const cmdArgs = ["develop", installable || "."];
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

      const data = parseDevelopOutput(
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
        formatDevelop,
        compactDevelopMap,
        formatDevelopCompact,
        compact === false,
      );
    },
  );
}
