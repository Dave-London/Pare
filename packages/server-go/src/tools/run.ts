import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoRunOutput } from "../lib/parsers.js";
import { formatGoRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { GoRunResultSchema } from "../schemas/index.js";

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
          .describe("Build flags to pass to go run (e.g., -race, -tags)"),
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
    async ({ path, file, args, buildArgs, compact }) => {
      const cwd = path || process.cwd();
      const target = file || ".";
      assertNoFlagInjection(target, "file");
      for (const a of buildArgs ?? []) {
        assertNoFlagInjection(a, "buildArgs");
      }
      const cmdArgs = ["run", ...(buildArgs || []), target];
      const programArgs = args || [];
      if (programArgs.length > 0) {
        cmdArgs.push("--", ...programArgs);
      }
      const result = await goCmd(cmdArgs, cwd);
      const data = parseGoRunOutput(result.stdout, result.stderr, result.exitCode);
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
