import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  INPUT_LIMITS,
  run,
  assertAllowedByPolicy,
  assertAllowedRoot,
} from "@paretools/shared";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { ProcessRunResultSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Process Run",
      description:
        "Runs a command and returns structured output (stdout, stderr, exit code, duration, timeout status).",
      inputSchema: {
        command: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Command to run (e.g., 'node', 'python', 'echo')"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Arguments to pass to the command"),
        cwd: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600_000)
          .optional()
          .default(60_000)
          .describe("Timeout in milliseconds (default: 60000, max: 600000)"),
        env: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe("Additional environment variables as key-value pairs"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: ProcessRunResultSchema,
    },
    async ({ command, args, cwd, timeout, env, compact }) => {
      assertAllowedByPolicy(command, "process");
      const workDir = cwd || process.cwd();
      assertAllowedRoot(workDir, "process");
      const timeoutMs = timeout ?? 60_000;

      const start = Date.now();
      let timedOut = false;
      let signal: string | undefined;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await run(command, args ?? [], {
          cwd: workDir,
          timeout: timeoutMs,
          env: env ? ({ ...process.env, ...env } as Record<string, string>) : undefined,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);

        // Detect timeout errors from the shared runner
        if (errMsg.includes("timed out")) {
          timedOut = true;
          // Extract signal from message like "...was killed (SIGTERM)."
          const sigMatch = errMsg.match(/\((\w+)\)/);
          signal = sigMatch?.[1];
          result = {
            exitCode: 124, // Standard timeout exit code
            stdout: "",
            stderr: errMsg,
          };
        } else {
          // Re-throw non-timeout errors (command not found, permission denied, etc.)
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseRunOutput(
        command,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
        signal,
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
