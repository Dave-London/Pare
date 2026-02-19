import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseTaskOutput } from "../lib/parsers.js";
import { formatTask, compactTaskMap, formatTaskCompact } from "../lib/formatters.js";
import { DenoTaskResultSchema } from "../schemas/index.js";

/** Registers the `task` tool on the given MCP server. */
export function registerTaskTool(server: McpServer) {
  server.registerTool(
    "task",
    {
      title: "Deno Task",
      description:
        "Runs a named task from deno.json via `deno task` and returns structured output (stdout, stderr, exit code, duration).",
      inputSchema: {
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Task name as defined in deno.json"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the task"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: DenoTaskResultSchema,
    },
    async ({ name, args, path, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(name, "name");

      const cmdArgs = ["task", name, ...(args || [])];

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await denoCmd(cmdArgs, cwd);
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

      const data = parseTaskOutput(
        name,
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
        formatTask,
        compactTaskMap,
        formatTaskCompact,
        compact === false,
      );
    },
  );
}
