import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGenerateOutput } from "../lib/parsers.js";
import { formatGoGenerate, compactGenerateMap, formatGenerateCompact } from "../lib/formatters.js";
import { GoGenerateResultSchema } from "../schemas/index.js";

/** Registers the `generate` tool on the given MCP server. */
export function registerGenerateTool(server: McpServer) {
  server.registerTool(
    "generate",
    {
      title: "Go Generate",
      description:
        "Runs go generate directives in Go source files. Use instead of running `go generate` in the terminal. WARNING: `go generate` executes arbitrary commands embedded in //go:generate directives in source files. Only use this tool on trusted code that you have reviewed.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("Packages to generate (default: ./...)"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Print the commands that would be executed but do not run them (-n). Essential for safe previewing.",
          ),
        run: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Run only generators whose directive matches this regexp (-run <regexp>). Reduces execution scope and risk.",
          ),
        skip: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Skip generators whose directive matches this regexp (-skip <regexp>). Useful to exclude known-slow or broken generators.",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print the names of packages and files as they are processed (-v)"),
        commands: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print commands as they are executed (-x)"),
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(600000)
          .optional()
          .describe("Execution timeout in milliseconds for go generate"),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags for conditional compilation (-tags)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoGenerateResultSchema,
    },
    async ({
      path,
      patterns,
      dryRun,
      run: runFilter,
      skip,
      verbose,
      commands,
      timeout,
      tags,
      compact,
    }) => {
      for (const p of patterns || []) {
        assertNoFlagInjection(p, "patterns");
      }
      if (runFilter) assertNoFlagInjection(runFilter, "run");
      if (skip) assertNoFlagInjection(skip, "skip");
      const cwd = path || process.cwd();
      const args = ["generate"];
      if (dryRun) args.push("-n");
      if (runFilter) args.push("-run", runFilter);
      if (skip) args.push("-skip", skip);
      if (verbose) args.push("-v");
      if (commands) args.push("-x");
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        args.push("-tags", tags.join(","));
      }
      args.push(...(patterns || ["./..."]));
      let timedOut = false;
      let result: { stdout: string; stderr: string; exitCode: number };
      try {
        result = await goCmd(args, cwd, timeout);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("timed out")) {
          timedOut = true;
          result = { stdout: "", stderr: msg, exitCode: 124 };
        } else {
          throw err;
        }
      }

      const data = parseGoGenerateOutput(result.stdout, result.stderr, result.exitCode, timedOut);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoGenerate,
        compactGenerateMap,
        formatGenerateCompact,
        compact === false,
      );
    },
  );
}
