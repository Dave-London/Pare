import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { rubyCmd } from "../lib/ruby-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { RubyRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Ruby Run",
      description:
        "Executes a Ruby script file and returns structured output (stdout, stderr, exit code, duration).",
      inputSchema: {
        file: z.string().max(INPUT_LIMITS.PATH_MAX).describe("Path to the Ruby file to execute"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Arguments to pass to the Ruby script"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: RubyRunResultSchema,
    },
    async ({ file, args, path, compact }) => {
      assertNoFlagInjection(file, "file");

      const cwd = path || process.cwd();
      const cmdArgs = [file, ...(args || [])];

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await rubyCmd(cmdArgs, cwd);
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

      const data = parseRunOutput(
        file,
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
        formatRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
