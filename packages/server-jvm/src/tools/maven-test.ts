import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { mvnCmd } from "../lib/jvm-runner.js";
import { parseMavenTest } from "../lib/parsers.js";
import { formatMavenTest, compactMavenTestMap, formatMavenTestCompact } from "../lib/formatters.js";
import { MavenTestResultSchema } from "../schemas/index.js";

export function registerMavenTestTool(server: McpServer) {
  server.registerTool(
    "maven-test",
    {
      title: "Maven Test",
      description:
        "Runs `mvn test` and returns structured Surefire test results with pass/fail/error counts.",
      inputSchema: {
        path: projectPathInput,
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Test filter pattern (passed via -Dtest=pattern)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Maven arguments"),
        compact: compactInput,
      },
      outputSchema: MavenTestResultSchema,
    },
    async ({ path, filter, args, compact }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const cmdArgs = ["test"];
      if (filter) cmdArgs.push(`-Dtest=${filter}`);
      cmdArgs.push(...(args ?? []));

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await mvnCmd(cmdArgs, cwd);
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

      const data = parseMavenTest(
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
        formatMavenTest,
        compactMavenTestMap,
        formatMavenTestCompact,
        compact === false,
      );
    },
  );
}
