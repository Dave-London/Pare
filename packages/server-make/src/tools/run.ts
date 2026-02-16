import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { makeCmd, justCmd, resolveTool } from "../lib/make-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { MakeRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Make/Just Run",
      description:
        "Runs a make or just target and returns structured output (stdout, stderr, exit code, duration). Auto-detects make vs just. Use instead of running `make` or `just` in the terminal.",
      inputSchema: {
        target: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Target to run"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the target"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        tool: z
          .enum(["auto", "make", "just"])
          .optional()
          .default("auto")
          .describe('Task runner to use: "auto" detects from files, or force "make"/"just"'),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Path to a non-default makefile or justfile (maps to make -f FILE / just --justfile FILE)",
          ),
        env: z
          .record(z.string(), z.string())
          .optional()
          .describe("Environment variables to pass to the target execution (key-value pairs)"),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview commands without executing (make -n / just --dry-run)"),
        jobs: z.number().optional().describe("Number of parallel jobs (make -j N, make only)"),
        silent: z
          .boolean()
          .optional()
          .describe("Suppress command echoing (make -s / just --quiet)"),
        keepGoing: z
          .boolean()
          .optional()
          .describe("Continue after errors in independent targets (make -k, make only)"),
        alwaysMake: z
          .boolean()
          .optional()
          .describe("Force rebuild regardless of timestamps (make -B, make only)"),
        verbose: z
          .boolean()
          .optional()
          .describe("Enable verbose output (just --verbose, just only)"),
        trace: z.boolean().optional().describe("Trace execution order (make --trace, make only)"),
        question: z
          .boolean()
          .optional()
          .describe(
            "Check if target is up to date without executing (make -q, make only). Exit code 0 = up to date.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: MakeRunResultSchema,
    },
    async ({
      target,
      args,
      path,
      tool,
      file,
      env,
      dryRun,
      jobs,
      silent,
      keepGoing,
      alwaysMake,
      verbose,
      trace,
      question,
      compact,
    }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(target, "target");
      if (file) assertNoFlagInjection(file, "file");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const resolved = resolveTool(tool || "auto", cwd);

      // Build flags before the target
      const flags: string[] = [];
      if (resolved === "just") {
        if (file) flags.push("--justfile", file);
        if (dryRun) flags.push("--dry-run");
        if (silent) flags.push("--quiet");
        if (verbose) flags.push("--verbose");
      } else {
        // make
        if (file) flags.push("-f", file);
        if (dryRun) flags.push("-n");
        if (jobs !== undefined) flags.push("-j", String(jobs));
        if (silent) flags.push("-s");
        if (keepGoing) flags.push("-k");
        if (alwaysMake) flags.push("-B");
        if (trace) flags.push("--trace");
        if (question) flags.push("-q");
      }

      // Build environment variable arguments
      // For make: pass as VAR=VALUE positional args
      // For just: pass as VAR=VALUE positional args (just supports env var overrides this way)
      const envArgs: string[] = [];
      if (env) {
        for (const [key, value] of Object.entries(env)) {
          envArgs.push(`${key}=${value}`);
        }
      }

      const cmdArgs = [...flags, target, ...(args || []), ...envArgs];

      const start = Date.now();
      const result =
        resolved === "just" ? await justCmd(cmdArgs, cwd) : await makeCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parseRunOutput(
        target,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        resolved,
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
