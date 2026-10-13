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

/**
 * The verbosity flag for the run: quiet by default, as verbose as the caller asked.
 *
 * It is an absolute `--verbosity=N`, placed after every other option. `-q` and
 * `-v` are relative: each one moves the level by one, and they add up across this
 * tool, `extraArgs`, and the project's `addopts`. At two levels of quiet pytest
 * stops printing its final summary line, which is the only place the counts come
 * from, so a stray `-q` used to turn a passing run into `passed: 0` (#1118,
 * #1110). The last verbosity option wins, so pinning it at the end makes the
 * output shape independent of whatever came before.
 *
 * Because the pin overrides relative flags, it has to carry the caller's explicit
 * requests itself: `verbose`, each `-v` in `extraArgs` (`-vv` gives the full
 * assertion diff), or an explicit `--verbosity=N` there. Requests for less output
 * are ignored; the level never goes below -1, which is what `-q` alone gives.
 *
 * Exported for unit testing.
 */
export function pytestVerbosityArg(verbose: boolean | undefined, extraArgs?: string[]): string {
  let level = verbose ? 1 : 0;
  let explicit: string | undefined;
  const args = extraArgs ?? [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") break; // everything after a bare `--` is positional
    if (arg === "--verbose") level += 1;
    else if (arg.startsWith("--verbosity=")) explicit = arg.slice("--verbosity=".length);
    else if (arg === "--verbosity") explicit = args[i + 1];
    else level += countClusteredVerbose(arg);
  }
  // An explicit level is passed through as written (so pytest reports its own
  // error for a bad one), except that it is not allowed to go below -1.
  if (explicit !== undefined && /^-?\d+$/.test(explicit)) {
    return `--verbosity=${Number(explicit) < -1 ? "-1" : explicit}`;
  }
  return `--verbosity=${level > 0 ? level : -1}`;
}

/** pytest short options that take a value; in a cluster, the rest of the token is that value. */
const PYTEST_SHORT_OPTIONS_WITH_VALUE = new Set(["k", "m", "p", "c", "o", "r", "W", "n"]);

/**
 * Counts `v` flags in a short-option token: `-v` is 1, `-vv` is 2, and pytest also
 * accepts clusters such as `-xvv`. Stops at a value-taking option, whose value is the
 * rest of the token (`-kvv` is the keyword "vv", not two verbose flags).
 */
function countClusteredVerbose(arg: string): number {
  if (!/^-[A-Za-z]/.test(arg) || arg.startsWith("--")) return 0;
  let count = 0;
  for (const ch of arg.slice(1)) {
    if (PYTEST_SHORT_OPTIONS_WITH_VALUE.has(ch)) break;
    if (!/[A-Za-z]/.test(ch)) return 0; // not a flag cluster (e.g. "-n4", "-x=1")
    if (ch === "v") count++;
  }
  return count;
}

/**
 * Appends `extraArgs` and the verbosity pin. The pin goes after the options so it
 * wins, but before a bare `--`: after that marker pytest would read it as a path.
 */
function pushExtraArgsAndVerbosity(
  args: string[],
  extraArgs: string[] | undefined,
  verbose: boolean | undefined,
): void {
  const extras = extraArgs ?? [];
  const pin = pytestVerbosityArg(verbose, extras);
  const separator = extras.indexOf("--");
  if (separator === -1) {
    args.push(...extras, pin);
  } else {
    args.push(...extras.slice(0, separator), pin, ...extras.slice(separator));
  }
}

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
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'Enable verbose output (verbosity 1). For more, add "-vv" to extraArgs, ' +
              "e.g. to see a full assertion diff",
          ),
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
                "to disable a broken plugin). Each element is validated for control characters. " +
                "Verbosity is set by the tool: -v/-vv/--verbosity=N here raise it, -q is ignored " +
                "(the output never goes quieter than -q), and -v/-q in the project's addopts are overridden.",
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
      const args = [`--tb=${tbStyle}`];

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
      pushExtraArgsAndVerbosity(args, extraArgs, verbose);
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
