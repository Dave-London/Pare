import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { swiftCmd } from "../lib/swift-runner.js";
import { parseTestOutput } from "../lib/parsers.js";
import { formatTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { SwiftTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Swift Test",
      description:
        "Runs swift test and returns structured test results (name, status, pass/fail counts).",
      inputSchema: {
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test name filter pattern (--filter)"),
        parallel: z
          .boolean()
          .optional()
          .default(true)
          .describe("Run tests in parallel (--parallel)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftTestResultSchema,
    },
    async ({ filter, parallel, path, compact }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const cmdArgs = ["test"];
      if (filter) cmdArgs.push("--filter", filter);
      if (parallel) cmdArgs.push("--parallel");

      const start = Date.now();
      const result = await swiftCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parseTestOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
