import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { gradleCmd } from "../lib/jvm-runner.js";
import { parseGradleTest } from "../lib/parsers.js";
import {
  formatGradleTest,
  compactGradleTestMap,
  formatGradleTestCompact,
} from "../lib/formatters.js";
import { GradleTestResultSchema } from "../schemas/index.js";

export function registerGradleTestTool(server: McpServer) {
  server.registerTool(
    "gradle-test",
    {
      title: "Gradle Test",
      description:
        "Runs `gradle test` and returns structured test results with pass/fail counts and individual test outcomes.",
      inputSchema: {
        path: projectPathInput,
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Test filter pattern (passed via --tests)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Gradle arguments"),
        compact: compactInput,
      },
      outputSchema: GradleTestResultSchema,
    },
    async ({ path, filter, args, compact }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const cmdArgs = ["test"];
      if (filter) cmdArgs.push("--tests", filter);
      cmdArgs.push(...(args ?? []));

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await gradleCmd(cmdArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseGradleTest(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGradleTest,
        compactGradleTestMap,
        formatGradleTestCompact,
        compact === false,
      );
    },
  );
}
