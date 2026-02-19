import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoRunOutput } from "../lib/parsers.js";
import { formatGoRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { GoRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Go Run",
      description: "Runs a Go program and returns structured output (stdout, stderr, exit code).",
      inputSchema: {
        path: projectPathInput,
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .default(".")
          .describe("Go file or package to run (default: .)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Arguments to pass to the program"),
        buildArgs: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            "Build flags to pass to go run (e.g., '-tags=integration'). " +
              "Note: flags like -race and -tags have dedicated params for discoverability, " +
              "but can also be passed here. Flag injection checks are not applied to buildArgs " +
              "since they are intentionally build flags.",
          ),
        race: z.boolean().optional().default(false).describe("Enable data race detection (-race)"),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags for conditional compilation (-tags)"),
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(600000)
          .optional()
          .describe(
            "Program execution timeout in milliseconds. Overrides the default 300s build timeout. " +
              "Min: 1000 (1s), Max: 600000 (10m).",
          ),
        exec: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Custom execution wrapper (-exec). The built binary is passed to this command instead of being run directly.",
          ),
        maxOutput: z
          .number()
          .int()
          .min(1024)
          .max(1048576)
          .optional()
          .describe(
            "Maximum length in characters for stdout/stderr output. Output exceeding this limit will be truncated. " +
              "Default: no limit. Max: 1048576 (1MB).",
          ),
        stream: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Return tail-focused output for long-running programs. This is a streaming-like mode that keeps recent lines.",
          ),
        tailLines: z
          .number()
          .int()
          .min(10)
          .max(5000)
          .optional()
          .default(200)
          .describe("When stream is true, keep this many trailing stdout/stderr lines"),
        compact: compactInput,
      },
      outputSchema: GoRunResultSchema,
    },
    async ({
      path,
      file,
      args,
      buildArgs,
      race,
      tags,
      timeout,
      exec: execWrapper,
      maxOutput,
      stream,
      tailLines,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const target = file || ".";
      assertNoFlagInjection(target, "file");
      if (execWrapper) assertNoFlagInjection(execWrapper, "exec");
      // buildArgs are intentionally build flags (e.g., -race, -tags, -ldflags)
      // so assertNoFlagInjection is not applied to them.
      const cmdArgs = ["run"];
      if (race) cmdArgs.push("-race");
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        cmdArgs.push("-tags", tags.join(","));
      }
      if (execWrapper) cmdArgs.push(`-exec=${execWrapper}`);
      cmdArgs.push(...(buildArgs || []), target);
      const programArgs = args || [];
      if (programArgs.length > 0) {
        cmdArgs.push("--", ...programArgs);
      }
      let timedOut = false;
      let signal: string | undefined;
      let result: { stdout: string; stderr: string; exitCode: number };
      try {
        const runResult = await goCmd(cmdArgs, cwd, timeout);
        result = runResult;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("timed out")) {
          timedOut = true;
          signal = extractSignal(msg);
          result = { stdout: "", stderr: msg, exitCode: 124 };
        } else {
          throw err;
        }
      }

      const data = parseGoRunOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        timedOut,
        signal,
      );

      if (stream) {
        const lineCap = tailLines ?? 200;
        if (data.stdout) data.stdout = tailOutput(data.stdout, lineCap);
        if (data.stderr) data.stderr = tailOutput(data.stderr, lineCap);
      }

      // Apply maxOutput truncation with truncation flag tracking
      if (maxOutput) {
        if (data.stdout && data.stdout.length > maxOutput) {
          data.stdout = data.stdout.slice(0, maxOutput) + "\n... (truncated)";
          data.stdoutTruncated = true;
        }
        if (data.stderr && data.stderr.length > maxOutput) {
          data.stderr = data.stderr.slice(0, maxOutput) + "\n... (truncated)";
          data.stderrTruncated = true;
        }
      }

      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}

function tailOutput(text: string, lineCount: number): string {
  const lines = text.split("\n");
  if (lines.length <= lineCount) return text;
  return lines.slice(-lineCount).join("\n");
}

function extractSignal(message: string): string | undefined {
  const match = message.match(/\((SIG[A-Z0-9]+)\)/);
  return match?.[1];
}
