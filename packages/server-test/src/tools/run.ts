import { z } from "zod";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestOutput } from "../lib/parsers/pytest.js";
import { parseJestJson } from "../lib/parsers/jest.js";
import { parseVitestJson } from "../lib/parsers/vitest.js";
import { parseMochaJson } from "../lib/parsers/mocha.js";
import { formatTestRun, compactTestRunMap, formatTestRunCompact } from "../lib/formatters.js";
import { TestRunSchema } from "../schemas/index.js";

/** Exported for unit testing. */
export function getRunCommand(
  framework: Framework,
  args: string[],
): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return { cmd: "python", cmdArgs: ["-m", "pytest", "-v", ...args] };
    case "jest":
      return { cmd: "npx", cmdArgs: ["jest", "--json", ...args] };
    case "vitest":
      return { cmd: "npx", cmdArgs: ["vitest", "run", "--reporter=json", ...args] };
    case "mocha":
      return { cmd: "npx", cmdArgs: ["mocha", "--reporter", "json", ...args] };
  }
}

/** Build the extra CLI args for the `run` tool. Exported for unit testing. */
export function buildRunExtraArgs(
  framework: Framework,
  opts: {
    filter?: string;
    shard?: string;
    config?: string;
    updateSnapshots?: boolean;
    coverage?: boolean;
    onlyChanged?: boolean;
    exitFirst?: boolean;
    passWithNoTests?: boolean;
    bail?: number | boolean;
    testNamePattern?: string;
    workers?: number;
    args?: string[];
  },
): string[] {
  const extraArgs = [...(opts.args || [])];

  if (opts.filter) {
    switch (framework) {
      case "pytest":
        extraArgs.push("-k", opts.filter);
        break;
      case "jest":
        extraArgs.push("--testPathPattern", opts.filter);
        break;
      case "vitest":
        extraArgs.push(opts.filter);
        break;
      case "mocha":
        extraArgs.push("--grep", opts.filter);
        break;
    }
  }

  // Shard support (jest/vitest)
  if (opts.shard) {
    switch (framework) {
      case "jest":
      case "vitest":
        extraArgs.push("--shard", opts.shard);
        break;
      case "pytest":
      case "mocha":
        // pytest/mocha don't have native --shard; ignore silently
        break;
    }
  }

  // Config file support
  if (opts.config) {
    switch (framework) {
      case "pytest":
        extraArgs.push(`--override-ini=config=${opts.config}`);
        break;
      case "jest":
        extraArgs.push("--config", opts.config);
        break;
      case "vitest":
        extraArgs.push("--config", opts.config);
        break;
      case "mocha":
        extraArgs.push("--config", opts.config);
        break;
    }
  }

  if (opts.updateSnapshots && (framework === "vitest" || framework === "jest")) {
    extraArgs.push("-u");
  }

  if (opts.coverage) {
    switch (framework) {
      case "vitest":
      case "jest":
        extraArgs.push("--coverage");
        break;
      case "pytest":
        extraArgs.push("--cov");
        break;
      case "mocha":
        break;
    }
  }

  if (opts.onlyChanged) {
    switch (framework) {
      case "pytest":
        extraArgs.push("--lf");
        break;
      case "jest":
        extraArgs.push("--onlyChanged");
        break;
      case "vitest":
        extraArgs.push("--changed");
        break;
      case "mocha":
        break;
    }
  }

  if (opts.exitFirst) {
    switch (framework) {
      case "pytest":
        extraArgs.push("-x");
        break;
      case "jest":
      case "vitest":
        extraArgs.push("--bail=1");
        break;
      case "mocha":
        extraArgs.push("-b");
        break;
    }
  }

  if (opts.passWithNoTests && (framework === "jest" || framework === "vitest")) {
    extraArgs.push("--passWithNoTests");
  }

  // Bail: fail-fast with optional count
  if (opts.bail !== undefined && opts.bail !== false) {
    const n = opts.bail === true ? 1 : opts.bail;
    switch (framework) {
      case "pytest":
        extraArgs.push(`--maxfail=${n}`);
        break;
      case "jest":
        extraArgs.push(`--bail=${n}`);
        break;
      case "vitest":
        extraArgs.push(`--bail=${n}`);
        break;
      case "mocha":
        extraArgs.push("--bail");
        break;
    }
  }

  // Test name pattern: filter tests by name
  if (opts.testNamePattern) {
    switch (framework) {
      case "pytest":
        extraArgs.push("-k", opts.testNamePattern);
        break;
      case "jest":
        extraArgs.push(`--testNamePattern=${opts.testNamePattern}`);
        break;
      case "vitest":
        extraArgs.push(`--grep=${opts.testNamePattern}`);
        break;
      case "mocha":
        extraArgs.push("--grep", opts.testNamePattern);
        break;
    }
  }

  // Workers: parallel execution
  if (opts.workers !== undefined) {
    switch (framework) {
      case "pytest":
        extraArgs.push("-n", String(opts.workers));
        break;
      case "jest":
        extraArgs.push(`--maxWorkers=${opts.workers}`);
        break;
      case "vitest":
        extraArgs.push(`--pool.threads.maxThreads=${opts.workers}`);
        break;
      case "mocha":
        extraArgs.push("--jobs", String(opts.workers));
        break;
    }
  }

  return extraArgs;
}

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Run Tests",
      description:
        "Auto-detects test framework (pytest/jest/vitest/mocha), runs tests, returns structured results with failures. Use instead of running pytest/jest/vitest/mocha in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        framework: z
          .enum(["pytest", "jest", "vitest", "mocha"])
          .optional()
          .describe("Force a specific framework instead of auto-detecting"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test filter pattern (file path or test name pattern)"),
        shard: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            'Shard spec for distributed test execution (e.g., "1/3") via --shard (jest/vitest)',
          ),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to test config file (--config for all frameworks)"),
        updateSnapshots: z
          .boolean()
          .optional()
          .default(false)
          .describe("Update snapshots (vitest/jest only, adds -u flag)"),
        coverage: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run with coverage (adds --coverage for vitest/jest, --cov for pytest)"),
        onlyChanged: z
          .boolean()
          .optional()
          .describe(
            "Run only tests affected by recent changes (maps to --lf for pytest, --onlyChanged for jest, --changed for vitest)",
          ),
        exitFirst: z
          .boolean()
          .optional()
          .describe(
            "Stop on first test failure (maps to -x for pytest, --bail=1 for jest/vitest, -b for mocha)",
          ),
        passWithNoTests: z
          .boolean()
          .optional()
          .describe(
            "Exit successfully when no tests are found (maps to --passWithNoTests for jest/vitest)",
          ),
        bail: z
          .union([z.number().int().min(1), z.boolean()])
          .optional()
          .describe(
            "Fail fast after N failures (maps to --maxfail=N for pytest, --bail=N for jest/vitest, --bail for mocha). Pass true for 1.",
          ),
        testNamePattern: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Filter tests by name pattern (maps to -k for pytest, --testNamePattern for jest, --grep for vitest/mocha)",
          ),
        workers: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            "Number of parallel workers (maps to -n for pytest-xdist, --maxWorkers for jest, --pool.threads.maxThreads for vitest, --jobs for mocha)",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the test runner"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: TestRunSchema,
    },
    async ({
      path,
      framework,
      filter,
      shard,
      config,
      updateSnapshots,
      coverage,
      onlyChanged,
      exitFirst,
      passWithNoTests,
      bail,
      testNamePattern,
      workers,
      args,
      compact,
    }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (filter) {
        assertNoFlagInjection(filter, "filter");
      }
      if (shard) {
        assertNoFlagInjection(shard, "shard");
      }
      if (config) {
        assertNoFlagInjection(config, "config");
      }
      if (testNamePattern) {
        assertNoFlagInjection(testNamePattern, "testNamePattern");
      }

      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const extraArgs = buildRunExtraArgs(detected, {
        filter,
        shard,
        config,
        updateSnapshots,
        coverage,
        onlyChanged,
        exitFirst,
        passWithNoTests,
        bail,
        testNamePattern,
        workers,
        args,
      });

      // For vitest/jest, write JSON to a temp file instead of relying on
      // stdout capture. On Windows, npx.cmd can swallow or mangle stdout,
      // causing "No JSON output found" errors.
      // Mocha outputs JSON to stdout, so we don't use --outputFile for it.
      const useOutputFile = detected === "jest" || detected === "vitest";
      const tempPath = useOutputFile ? join(tmpdir(), `pare-test-${randomUUID()}.json`) : "";

      const { cmd, cmdArgs } = getRunCommand(detected, extraArgs);

      if (useOutputFile) {
        cmdArgs.push(`--outputFile=${tempPath}`);
      }

      const result = await run(cmd, cmdArgs, { cwd, timeout: 180_000 });

      // Combine stdout and stderr for parsing (some frameworks write to stderr)
      const output = result.stdout + "\n" + result.stderr;

      let testRun;
      switch (detected) {
        case "pytest":
          testRun = parsePytestOutput(output);
          break;
        case "jest": {
          const jsonStr = await readJsonOutput(tempPath, output);
          testRun = parseJestJson(jsonStr);
          break;
        }
        case "vitest": {
          const jsonStr = await readJsonOutput(tempPath, output);
          testRun = parseVitestJson(jsonStr);
          break;
        }
        case "mocha": {
          const jsonStr = extractJson(output);
          testRun = parseMochaJson(jsonStr);
          break;
        }
      }

      return compactDualOutput(
        testRun,
        result.stdout,
        formatTestRun,
        compactTestRunMap,
        formatTestRunCompact,
        compact === false,
      );
    },
  );
}

/**
 * Reads JSON output from a temp file, falling back to extracting it from
 * stdout if the file was not created. Always cleans up the temp file.
 * Exported for unit testing.
 */
export async function readJsonOutput(tempPath: string, output: string): Promise<string> {
  try {
    return await readFile(tempPath, "utf-8");
  } catch {
    // Temp file wasn't created — fall back to stdout extraction
    return extractJson(output);
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * Extracts the JSON object from mixed output that may include non-JSON text
 * before or after the actual JSON data.
 */
export function extractJson(output: string): string {
  // Try to find JSON object boundaries
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON output found. Ensure the test runner is configured to output JSON.");
  }

  return output.slice(start, end + 1);
}
