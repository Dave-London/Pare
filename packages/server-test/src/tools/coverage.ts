import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestCoverage } from "../lib/parsers/pytest.js";
import { parseJestCoverage } from "../lib/parsers/jest.js";
import { parseVitestCoverage } from "../lib/parsers/vitest.js";
import { formatCoverage } from "../lib/formatters.js";
import { CoverageSchema } from "../schemas/index.js";

function getCoverageCommand(framework: Framework): { cmd: string; cmdArgs: string[] } {
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
  }
}

export function registerCoverageTool(server: McpServer) {
  server.registerTool(
    "coverage",
    {
      title: "Test Coverage",
      description:
        "Runs tests with coverage and returns structured coverage summary per file. Use instead of running test coverage commands in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        framework: z
          .enum(["pytest", "jest", "vitest"])
          .optional()
          .describe("Force a specific framework instead of auto-detecting"),
      },
      outputSchema: CoverageSchema,
    },
    async ({ path, framework }) => {
      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const { cmd, cmdArgs } = getCoverageCommand(detected);
      const result = await run(cmd, cmdArgs, { cwd, timeout: 120_000 });

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
      }

      return dualOutput(coverage, formatCoverage);
    },
  );
}
