import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parseTestOutput } from "../lib/parsers.js";
import { formatTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { BunTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Bun Test",
      description:
        "Runs `bun test` and returns structured pass/fail results with per-test details.",
      inputSchema: {
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific test files or patterns to run"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter tests by name pattern (--test-name-pattern)"),
        timeout: z.number().optional().describe("Test timeout in milliseconds (--timeout)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunTestResultSchema,
    },
    async ({ files, filter, timeout, path, compact }) => {
      const cwd = path || process.cwd();

      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const cmdArgs = ["test"];
      if (filter) cmdArgs.push("--test-name-pattern", filter);
      if (timeout !== undefined) cmdArgs.push("--timeout", String(timeout));
      if (files) cmdArgs.push(...files);

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await bunCmd(cmdArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseTestOutput(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
