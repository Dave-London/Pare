import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestCoverage, parsePytestCoverageJson } from "../lib/parsers/pytest.js";
import { parseJestCoverage, parseJestCoverageJson } from "../lib/parsers/jest.js";
import { parseVitestCoverage, parseVitestCoverageJson } from "../lib/parsers/vitest.js";
import { parseMochaCoverage, parseMochaCoverageJson } from "../lib/parsers/mocha.js";
import { formatCoverage, compactCoverageMap, formatCoverageCompact } from "../lib/formatters.js";
import { CoverageSchema } from "../schemas/index.js";
import { TEST_CLI_TIMEOUT_MS } from "../lib/timeouts.js";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/** Exported for unit testing. */
export function getCoverageCommand(
  framework: Framework,
  extraArgs: string[],
  coverageJsonPath?: string,
): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return {
        cmd: "python",
        cmdArgs: [
          "-m",
          "pytest",
          "--cov",
          "--cov-report=term-missing",
          ...(coverageJsonPath ? [`--cov-report=json:${coverageJsonPath}`] : []),
          "-q",
          ...extraArgs,
        ],
      };
    case "jest":
      return {
        cmd: "npx",
        cmdArgs: [
          "jest",
          "--coverage",
          "--coverageReporters=text",
          ...(coverageJsonPath
            ? [
                "--coverageReporters=json-summary",
                `--coverageDirectory=${dirname(coverageJsonPath)}`,
              ]
            : []),
          ...extraArgs,
        ],
      };
    case "vitest":
      return {
        cmd: "npx",
        cmdArgs: [
          "vitest",
          "run",
          "--coverage",
          "--reporter=default",
          ...(coverageJsonPath
            ? [
                "--coverage.reporter=text",
                "--coverage.reporter=json-summary",
                `--coverage.reportsDirectory=${dirname(coverageJsonPath)}`,
              ]
            : []),
          ...extraArgs,
        ],
      };
    case "mocha":
      return {
        cmd: "npx",
        cmdArgs: [
          "nyc",
          "--reporter=text",
          ...(coverageJsonPath
            ? ["--reporter=json-summary", `--report-dir=${dirname(coverageJsonPath)}`]
            : []),
          ...extraArgs,
          "mocha",
        ],
      };
  }
}

/** Build extra CLI args for the `coverage` tool. Exported for unit testing. */
export function buildCoverageExtraArgs(
  framework: Framework,
  opts: {
    branch?: boolean;
    all?: boolean;
    filter?: string;
    source?: string[];
    exclude?: string[];
    failUnder?: number;
    args?: string[];
  },
): string[] {
  const extra: string[] = [...(opts.args || [])];

  if (opts.branch && framework === "pytest") {
    extra.push("--cov-branch");
  }

  if (opts.all) {
    switch (framework) {
      case "vitest":
        extra.push("--coverage.all");
        break;
      case "mocha":
        extra.push("--all");
        break;
      case "jest":
        extra.push("--collectCoverageFrom=**/*.{js,jsx,ts,tsx}");
        break;
      case "pytest":
        break;
    }
  }

  // Apply filter
  if (opts.filter) {
    switch (framework) {
      case "pytest":
        extra.push("-k", opts.filter);
        break;
      case "jest":
        extra.push("--testPathPattern", opts.filter);
        break;
      case "vitest":
        extra.push(opts.filter);
        break;
      case "mocha":
        extra.push("--grep", opts.filter);
        break;
    }
  }

  // Apply source scoping
  for (const s of opts.source ?? []) {
    switch (framework) {
      case "pytest":
        extra.push(`--cov=${s}`);
        break;
      case "jest":
        extra.push(`--collectCoverageFrom=${s}`);
        break;
      case "vitest":
        extra.push(`--coverage.include=${s}`);
        break;
      case "mocha":
        extra.push("--include", s);
        break;
    }
  }

  // Apply exclude patterns
  for (const e of opts.exclude ?? []) {
    switch (framework) {
      case "pytest":
        extra.push(`--cov-config=.coveragerc`); // pytest uses config for exclude
        break;
      case "jest":
        extra.push(`--coveragePathIgnorePatterns=${e}`);
        break;
      case "vitest":
        extra.push(`--coverage.exclude=${e}`);
        break;
      case "mocha":
        extra.push("--exclude", e);
        break;
    }
  }

  // Fail-under: minimum coverage threshold
  if (opts.failUnder !== undefined) {
    switch (framework) {
      case "pytest":
        extra.push(`--cov-fail-under=${opts.failUnder}`);
        break;
      case "jest":
        extra.push(`--coverageThreshold={"global":{"lines":${opts.failUnder}}}`);
        break;
      case "vitest":
        extra.push(`--coverage.thresholds.lines=${opts.failUnder}`);
        break;
      case "mocha":
        extra.push(`--check-coverage`, `--lines`, String(opts.failUnder));
        break;
    }
  }

  return extra;
}

/** Registers the `coverage` tool on the given MCP server. */
export function registerCoverageTool(server: McpServer) {
  server.registerTool(
    "coverage",
    {
      title: "Test Coverage",
      description: "Runs tests with coverage and returns structured coverage summary per file.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        framework: z
          .enum(["pytest", "jest", "vitest", "mocha"])
          .optional()
          .describe("Force a specific framework instead of auto-detecting"),
        branch: z
          .boolean()
          .optional()
          .describe("Collect branch coverage (maps to --cov-branch for pytest)"),
        all: z
          .boolean()
          .optional()
          .describe(
            "Include all source files in coverage, even untested ones (maps to --coverage.all for vitest, --all for nyc)",
          ),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test filter pattern to run coverage on a subset of tests"),
        source: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            "Source paths to scope coverage (maps to --cov=PATH for pytest, --collectCoverageFrom for jest, --coverage.include for vitest, --include for nyc)",
          ),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("File patterns to exclude from coverage"),
        failUnder: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe(
            "Minimum line coverage percentage; fail if below (maps to --cov-fail-under for pytest, --coverageThreshold for jest, --coverage.thresholds.lines for vitest, --check-coverage --lines for nyc)",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the coverage runner"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: CoverageSchema,
    },
    async ({ path, framework, branch, all, filter, source, exclude, failUnder, args, compact }) => {
      for (const s of source ?? []) {
        assertNoFlagInjection(s, "source");
      }
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const extraArgs = buildCoverageExtraArgs(detected, {
        branch,
        all,
        filter,
        source,
        exclude,
        failUnder,
        args,
      });

      const tempDir = join(tmpdir(), `pare-coverage-${randomUUID()}`);
      const coverageJsonPath =
        detected === "pytest"
          ? join(tempDir, "coverage.json")
          : join(tempDir, "coverage-summary.json");
      await mkdir(tempDir, { recursive: true });

      const { cmd, cmdArgs } = getCoverageCommand(detected, extraArgs, coverageJsonPath);
      const result = await run(cmd, cmdArgs, { cwd, timeout: TEST_CLI_TIMEOUT_MS });
      const output = result.stdout + "\n" + result.stderr;

      let coverage;
      try {
        const jsonCoverage = await readFile(coverageJsonPath, "utf-8");
        switch (detected) {
          case "pytest":
            coverage = parsePytestCoverageJson(jsonCoverage);
            break;
          case "jest":
            coverage = parseJestCoverageJson(jsonCoverage);
            break;
          case "vitest":
            coverage = parseVitestCoverageJson(jsonCoverage);
            break;
          case "mocha":
            coverage = parseMochaCoverageJson(jsonCoverage);
            break;
        }
      } catch {
        // Fallback when the runner didn't emit JSON coverage output.
        switch (detected) {
          case "pytest":
            coverage = parsePytestCoverage(output);
            break;
          case "jest":
            coverage = parseJestCoverage(output);
            break;
          case "vitest":
            coverage = parseVitestCoverage(output);
            break;
          case "mocha":
            coverage = parseMochaCoverage(output);
            break;
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }

      // Add meetsThreshold when failUnder is specified
      if (failUnder !== undefined) {
        coverage.meetsThreshold = coverage.summary.lines >= failUnder;
      }

      return compactDualOutput(
        coverage,
        result.stdout,
        formatCoverage,
        compactCoverageMap,
        formatCoverageCompact,
        compact === false,
      );
    },
  );
}
