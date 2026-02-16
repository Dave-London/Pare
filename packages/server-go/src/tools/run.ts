import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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
      description:
        "Runs a Go program and returns structured output (stdout, stderr, exit code). Use instead of running `go run` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
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
      const result = await goCmd(cmdArgs, cwd, timeout);
      const data = parseGoRunOutput(result.stdout, result.stderr, result.exitCode);

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
