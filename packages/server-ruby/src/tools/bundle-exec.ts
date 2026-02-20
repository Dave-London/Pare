import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { bundleCmd } from "../lib/ruby-runner.js";
import { parseBundleExecOutput } from "../lib/parsers.js";
import {
  formatBundleExec,
  compactBundleExecMap,
  formatBundleExecCompact,
} from "../lib/formatters.js";
import { BundleExecResultSchema } from "../schemas/index.js";

/** Registers the `bundle-exec` tool on the given MCP server. */
export function registerBundleExecTool(server: McpServer) {
  server.registerTool(
    "bundle-exec",
    {
      title: "Bundle Exec",
      description:
        "Executes a command in the context of the Gemfile bundle using `bundle exec` and returns structured output.",
      inputSchema: {
        command: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Command to execute in the bundle context (e.g., 'rake', 'rspec', 'rubocop')"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Arguments to pass to the command"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BundleExecResultSchema,
    },
    async ({ command, args, path, compact }) => {
      assertNoFlagInjection(command, "command");
      for (const arg of args || []) {
        assertNoFlagInjection(arg, "args");
      }

      const cwd = path || process.cwd();
      const cmdArgs = ["exec", command, ...(args || [])];

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await bundleCmd(cmdArgs, cwd);
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

      const data = parseBundleExecOutput(
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
        formatBundleExec,
        compactBundleExecMap,
        formatBundleExecCompact,
        compact === false,
      );
    },
  );
}
