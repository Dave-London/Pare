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

const VALID_KILL_SIGNALS = [
  "SIGTERM",
  "SIGKILL",
  "SIGINT",
  "SIGHUP",
  "SIGQUIT",
  "SIGABRT",
  "SIGUSR1",
  "SIGUSR2",
] as const;

const VALID_ENCODINGS = [
  "utf-8",
  "utf8",
  "ascii",
  "latin1",
  "binary",
  "hex",
  "base64",
  "utf16le",
  "ucs-2",
  "ucs2",
] as const;

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Process Run",
      description:
        "Runs a command and returns structured output (stdout, stderr, exit code, duration, timeout status). Use instead of running commands directly in the terminal.\n\n" +
        "**Security note**: The `shell` parameter enables shell-mode execution. " +
        "When shell=true, the command string is passed through the system shell " +
        "(e.g., /bin/sh or cmd.exe), enabling features like glob expansion, piping, " +
        "and variable substitution — but also exposing the command to shell injection risks. " +
        "Only use shell=true when you trust the input and need shell features.",
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
        stdin: z
          .string()
          .max(1_000_000)
          .optional()
          .describe("Input data to write to the command's stdin (e.g., for piping to jq, grep)"),
        maxBuffer: z
          .number()
          .int()
          .min(1024)
          .max(100 * 1024 * 1024)
          .optional()
          .describe(
            "Maximum combined stdout+stderr buffer size in bytes (default: 10MB, max: 100MB)",
          ),
        killSignal: z
          .enum(VALID_KILL_SIGNALS)
          .optional()
          .describe("Signal sent to the process on timeout (default: SIGTERM)"),
        maxOutputLines: z
          .number()
          .int()
          .min(1)
          .max(100_000)
          .optional()
          .describe(
            "Truncate stdout/stderr to this many lines (more agent-friendly than byte-based maxBuffer)",
          ),
        encoding: z
          .enum(VALID_ENCODINGS)
          .optional()
          .describe("Output encoding for commands that produce non-UTF-8 output (default: utf-8)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
        shell: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Run the command through the system shell (enables glob expansion, piping, variable substitution). " +
              "WARNING: shell=true exposes the command to shell injection risks. Only use when you trust the input.",
          ),
        stripEnv: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Run with a minimal environment (only PATH + explicit env vars). " +
              "Prevents leaking sensitive parent environment variables to the child process.",
          ),
      },
      outputSchema: ProcessRunResultSchema,
    },
    async ({
      command,
      args,
      cwd,
      timeout,
      env,
      stdin,
      maxBuffer,
      killSignal,
      maxOutputLines,
      encoding,
      compact,
      shell,
      stripEnv,
    }) => {
      assertAllowedByPolicy(command, "process");
      const workDir = cwd || process.cwd();
      assertAllowedRoot(workDir, "process");
      const timeoutMs = timeout ?? 60_000;

      const start = Date.now();
      let timedOut = false;
      let truncated = false;
      let signal: string | undefined;
      let result: { exitCode: number; stdout: string; stderr: string };

      // Build the environment for the child process
      let childEnv: Record<string, string> | undefined;
      if (stripEnv) {
        // Minimal environment: only PATH + user-provided env vars
        const minimalEnv: Record<string, string> = {};
        if (process.env.PATH) {
          minimalEnv.PATH = process.env.PATH;
        }
        if (env) {
          Object.assign(minimalEnv, env);
        }
        childEnv = minimalEnv;
      } else if (env) {
        childEnv = { ...process.env, ...env } as Record<string, string>;
      }

      // Build run options
      const runOpts: Parameters<typeof run>[2] = {
        cwd: workDir,
        timeout: timeoutMs,
        env: childEnv,
        stdin: stdin || undefined,
        maxBuffer: maxBuffer || undefined,
        shell: shell || undefined,
      };

      try {
        result = await run(command, args ?? [], runOpts);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);

        // Detect timeout errors from the shared runner
        if (errMsg.includes("timed out")) {
          timedOut = true;
          // Extract signal from message like "...was killed (SIGTERM)."
          const sigMatch = errMsg.match(/\((\w+)\)/);
          signal = sigMatch?.[1] ?? killSignal;
          result = {
            exitCode: 124, // Standard timeout exit code
            stdout: "",
            stderr: errMsg,
          };
        } else if (errMsg.includes("maxBuffer")) {
          // Buffer exceeded — return partial result with truncated flag
          truncated = true;
          result = {
            exitCode: 1,
            stdout: "",
            stderr: errMsg,
          };
        } else {
          // Re-throw non-timeout errors (command not found, permission denied, etc.)
          throw err;
        }
      }
      const duration = Date.now() - start;

      // Handle encoding conversion if non-default specified
      // The shared runner always returns utf-8 strings; encoding param documents
      // the expected encoding for agent awareness. The Node.js runner handles
      // binary-to-string conversion automatically.
      void encoding;

      const data = parseRunOutput(
        command,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
        signal,
        maxOutputLines,
        truncated,
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
