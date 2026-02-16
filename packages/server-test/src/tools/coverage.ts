import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, INPUT_LIMITS } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestCoverage } from "../lib/parsers/pytest.js";
import { parseJestCoverage } from "../lib/parsers/jest.js";
import { parseVitestCoverage } from "../lib/parsers/vitest.js";
import { parseMochaCoverage } from "../lib/parsers/mocha.js";
import { formatCoverage, compactCoverageMap, formatCoverageCompact } from "../lib/formatters.js";
import { CoverageSchema } from "../schemas/index.js";

/** Exported for unit testing. */
export function getCoverageCommand(framework: Framework): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return {
        cmd: "python",
        cmdArgs: ["-m", "pytest", "--cov", "--cov-report=term-missing", "-q"],
      };
    case "jest":
      return { cmd: "npx", cmdArgs: ["jest", "--coverage", "--coverageReporters=text"] };
    case "vitest":
      return { cmd: "npx", cmdArgs: ["vitest", "run", "--coverage", "--reporter=default"] };
    case "mocha":
      return { cmd: "npx", cmdArgs: ["nyc", "--reporter=text", "mocha"] };
  }
}

/** Build extra CLI args for the `coverage` tool. Exported for unit testing. */
export function buildCoverageExtraArgs(
  framework: Framework,
  opts: { branch?: boolean; all?: boolean },
): string[] {
  const extra: string[] = [];

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
    async ({ path, framework, branch, all, compact }) => {
      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const { cmd, cmdArgs } = getCoverageCommand(detected);

      const extraCovArgs = buildCoverageExtraArgs(detected, { branch, all });
      cmdArgs.push(...extraCovArgs);

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
