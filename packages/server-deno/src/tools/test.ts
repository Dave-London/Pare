import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  filePatternsInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseTestOutput } from "../lib/parsers.js";
import { formatTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { DenoTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Deno Test",
      description:
        "Runs `deno test` and returns structured pass/fail output with per-test results.",
      inputSchema: {
        files: filePatternsInput("Test files or directories to run (default: auto-discovered)"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter tests by name pattern (--filter)"),
        path: projectPathInput,
        allowAll: z
          .boolean()
          .optional()
          .default(true)
          .describe("Allow all permissions (-A). Defaults to true for test convenience."),
        failFast: z.boolean().optional().describe("Stop on first failure (--fail-fast)"),
        compact: compactInput,
      },
      outputSchema: DenoTestResultSchema,
    },
    async ({ files, filter, path, allowAll, failFast, compact }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const flags: string[] = ["test"];
      if (allowAll !== false) flags.push("-A");
      if (filter) flags.push("--filter", filter);
      if (failFast) flags.push("--fail-fast");

      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        flags.push(...files);
      }

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };
      try {
        result = await denoCmd(flags, cwd);
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
