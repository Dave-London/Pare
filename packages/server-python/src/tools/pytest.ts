// NOTE (Gap #190): Investigated JSON output for pytest. The --json-report flag requires
// the external pytest-json-report plugin which cannot be assumed installed. The built-in
// --junit-xml produces XML, not JSON. Current text parsing with warnings count is reliable
// enough. If pytest-json-report becomes standard, switch to JSON parsing here.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  assertSafePassthroughArg,
  coerceJsonArray,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  configInput,
} from "@paretools/shared";
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
      annotations: { readOnlyHint: true },
      inputSchema: {
        path: projectPathInput,
        pythonPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Python interpreter path to use (overrides venv/PATH detection)"),
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
        exitFirst: z.coerce
          .boolean()
          .optional()
          .default(false)
          .describe("Stop on first failure (-x)"),
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
        configFile: configInput("Path to pytest config file (-c FILE)"),
        env: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "Additional environment variables for the pytest process, merged over the " +
              'parent environment (e.g. {"PYTHONPATH": "src"} for src-layout projects)',
          ),
        extraArgs: z.preprocess(
          coerceJsonArray,
          z
            .array(z.string().max(INPUT_LIMITS.STRING_MAX))
            .max(INPUT_LIMITS.ARRAY_MAX)
            .optional()
            .describe(
              'Additional pytest CLI arguments passed through verbatim (e.g. ["-p", "no:logfire"] ' +
                "to disable a broken plugin). Each element is validated for control characters.",
            ),
        ),
        compact: compactInput,
      },
      outputSchema: PytestResultSchema,
    },
    async ({
      path,
      pythonPath,
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
      env,
      extraArgs,
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
      if (pythonPath) assertNoFlagInjection(pythonPath, "pythonPath");
      if (env) {
        for (const [key, value] of Object.entries(env)) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            throw new Error(
              `Invalid env: key "${key}" must match /^[A-Za-z_][A-Za-z0-9_]*$/ ` +
                "(letters, digits, and underscores, not starting with a digit).",
            );
          }
          assertSafePassthroughArg(value, `env.${key}`);
        }
      }
      if (extraArgs) {
        // `extraArgs` is an explicit passthrough field: the caller intends these to
        // reach pytest verbatim, so leading `-`/`--` flags (e.g. `-p no:logfire`)
        // are allowed. Only NUL/newline control chars are rejected.
        // See assertSafePassthroughArg and the same pattern in server-test.
        for (const arg of extraArgs) {
          assertSafePassthroughArg(arg, "extraArgs");
        }
      }

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
      if (extraArgs && extraArgs.length > 0) args.push(...extraArgs);
      if (targets && targets.length > 0) args.push(...targets);

      const result = await pytest(args, cwd, pythonPath, env);
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
