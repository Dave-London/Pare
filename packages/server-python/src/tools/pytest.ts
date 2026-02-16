import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pytest } from "../lib/python-runner.js";
import { parsePytestOutput } from "../lib/parsers.js";
import { formatPytest, compactPytestMap, formatPytestCompact } from "../lib/formatters.js";
import { PytestResultSchema } from "../schemas/index.js";

/** Registers the `pytest` tool on the given MCP server. */
export function registerPytestTool(server: McpServer) {
  server.registerTool(
    "pytest",
    {
      title: "pytest",
      description:
        "Runs pytest and returns structured test results (passed, failed, errors, skipped, failures). Use instead of running `pytest` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Test files or directories to run (default: auto-discover)"),
        markers: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Pytest marker expression (e.g. "not slow")'),
        verbose: z.boolean().optional().default(false).describe("Enable verbose output"),
        exitFirst: z.boolean().optional().default(false).describe("Stop on first failure (-x)"),
        maxFail: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Stop after N failures (--maxfail=N)"),
        collectOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only collect tests, do not run them (--collect-only)"),
        lastFailed: z
          .boolean()
          .optional()
          .default(false)
          .describe("Re-run only tests that failed last time (--lf)"),
        noCapture: z
          .boolean()
          .optional()
          .default(false)
          .describe("Disable stdout/stderr capturing, useful for print-debugging (-s)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PytestResultSchema,
    },
    async ({
      path,
      targets,
      markers,
      verbose,
      exitFirst,
      maxFail,
      collectOnly,
      lastFailed,
      noCapture,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      if (markers) assertNoFlagInjection(markers, "markers");

      const args = ["--tb=short", "-q"];

      if (verbose) args.splice(args.indexOf("-q"), 1, "-v");
      if (exitFirst) args.push("-x");
      if (maxFail !== undefined) args.push(`--maxfail=${maxFail}`);
      if (collectOnly) args.push("--collect-only");
      if (lastFailed) args.push("--lf");
      if (noCapture) args.push("-s");
      if (markers) args.push("-m", markers);
      if (targets && targets.length > 0) args.push(...targets);

      const result = await pytest(args, cwd);
      const data = parsePytestOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatPytest,
        compactPytestMap,
        formatPytestCompact,
        compact === false,
      );
    },
  );
}
