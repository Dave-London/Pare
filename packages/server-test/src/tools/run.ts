import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestOutput } from "../lib/parsers/pytest.js";
import { parseJestJson } from "../lib/parsers/jest.js";
import { parseVitestJson } from "../lib/parsers/vitest.js";
import { formatTestRun } from "../lib/formatters.js";
import { TestRunSchema } from "../schemas/index.js";

function getRunCommand(framework: Framework, args: string[]): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return { cmd: "python", cmdArgs: ["-m", "pytest", "-v", ...args] };
    case "jest":
      return { cmd: "npx", cmdArgs: ["jest", "--json", ...args] };
    case "vitest":
      return { cmd: "npx", cmdArgs: ["vitest", "run", "--reporter=json", ...args] };
  }
}

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Run Tests",
      description:
        "Auto-detects test framework (pytest/jest/vitest), runs tests, returns structured results with failures",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        framework: z
          .enum(["pytest", "jest", "vitest"])
          .optional()
          .describe("Force a specific framework instead of auto-detecting"),
        filter: z
          .string()
          .optional()
          .describe("Test filter pattern (file path or test name pattern)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments to pass to the test runner"),
      },
      outputSchema: TestRunSchema,
    },
    async ({ path, framework, filter, args }) => {
      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const extraArgs = [...(args || [])];

      if (filter) {
        switch (detected) {
          case "pytest":
            extraArgs.push("-k", filter);
            break;
          case "jest":
            extraArgs.push("--testPathPattern", filter);
            break;
          case "vitest":
            extraArgs.push(filter);
            break;
        }
      }

      const { cmd, cmdArgs } = getRunCommand(detected, extraArgs);
      const result = await run(cmd, cmdArgs, { cwd, timeout: 120_000 });

      // Combine stdout and stderr for parsing (some frameworks write to stderr)
      const output = result.stdout + "\n" + result.stderr;

      let testRun;
      switch (detected) {
        case "pytest":
          testRun = parsePytestOutput(output);
          break;
        case "jest":
          testRun = parseJestJson(extractJson(output));
          break;
        case "vitest":
          testRun = parseVitestJson(extractJson(output));
          break;
      }

      return dualOutput(testRun, formatTestRun);
    },
  );
}

/**
 * Extracts the JSON object from mixed output that may include non-JSON text
 * before or after the actual JSON data.
 */
function extractJson(output: string): string {
  // Try to find JSON object boundaries
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON output found. Ensure the test runner is configured to output JSON.");
  }

  return output.slice(start, end + 1);
}
