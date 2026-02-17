// NOTE (Gap #190): Investigated JSON output for pytest. The --json-report flag requires
// the external pytest-json-report plugin which cannot be assumed installed. The built-in
// --junit-xml produces XML, not JSON. Current text parsing with warnings count is reliable
// enough. If pytest-json-report becomes standard, switch to JSON parsing here.

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
        "Runs pytest and returns structured test results (passed, failed, errors, skipped, failures).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
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
        keyword: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Keyword expression for test filtering (-k EXPR)"),
        tracebackStyle: z
          .enum(["short", "long", "line", "no", "native", "auto"])
          .optional()
          .describe("Traceback output style (default: short)"),
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
        coverage: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Source directory for coverage measurement (--cov=SOURCE)"),
        parallel: z
          .number()
          .int()
          .min(0)
          .max(128)
          .optional()
          .describe("Number of parallel workers for pytest-xdist (-n NUM, 0=auto)"),
        configFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to pytest config file (-c FILE)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: PytestResultSchema,
    },
    async ({
      path,
      targets,
      markers,
      keyword,
      tracebackStyle,
      verbose,
      exitFirst,
      maxFail,
      collectOnly,
      lastFailed,
      noCapture,
      coverage,
      parallel,
      configFile,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      if (markers) assertNoFlagInjection(markers, "markers");
      if (keyword) assertNoFlagInjection(keyword, "keyword");
      if (coverage) assertNoFlagInjection(coverage, "coverage");
      if (configFile) assertNoFlagInjection(configFile, "configFile");

      const tbStyle = tracebackStyle || "short";
      const args = [`--tb=${tbStyle}`, "-q"];

      if (verbose) args.splice(args.indexOf("-q"), 1, "-v");
      if (exitFirst) args.push("-x");
      if (maxFail !== undefined) args.push(`--maxfail=${maxFail}`);
      if (collectOnly) args.push("--collect-only");
      if (lastFailed) args.push("--lf");
      if (noCapture) args.push("-s");
      if (markers) args.push("-m", markers);
      if (keyword) args.push("-k", keyword);
      if (coverage) args.push(`--cov=${coverage}`);
      if (parallel != null) args.push("-n", String(parallel));
      if (configFile) args.push("-c", configFile);
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
