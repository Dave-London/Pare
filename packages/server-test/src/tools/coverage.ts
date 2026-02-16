import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestCoverage } from "../lib/parsers/pytest.js";
import { parseJestCoverage } from "../lib/parsers/jest.js";
import { parseVitestCoverage } from "../lib/parsers/vitest.js";
import { parseMochaCoverage } from "../lib/parsers/mocha.js";
import { formatCoverage, compactCoverageMap, formatCoverageCompact } from "../lib/formatters.js";
import { CoverageSchema } from "../schemas/index.js";

/** Exported for unit testing. */
export function getCoverageCommand(
  framework: Framework,
  extraArgs: string[],
): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return {
        cmd: "python",
        cmdArgs: ["-m", "pytest", "--cov", "--cov-report=term-missing", "-q", ...extraArgs],
      };
    case "jest":
      return {
        cmd: "npx",
        cmdArgs: ["jest", "--coverage", "--coverageReporters=text", ...extraArgs],
      };
    case "vitest":
      return {
        cmd: "npx",
        cmdArgs: ["vitest", "run", "--coverage", "--reporter=default", ...extraArgs],
      };
    case "mocha":
      return { cmd: "npx", cmdArgs: ["nyc", "--reporter=text", ...extraArgs, "mocha"] };
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
      description:
        "Runs tests with coverage and returns structured coverage summary per file. Use instead of running test coverage commands in the terminal.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CoverageSchema,
    },
    async ({ path, framework, branch, all, filter, source, exclude, failUnder, args, compact }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
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

      const { cmd, cmdArgs } = getCoverageCommand(detected, extraArgs);

      const result = await run(cmd, cmdArgs, { cwd, timeout: 180_000 });

      const output = result.stdout + "\n" + result.stderr;

      let coverage;
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
