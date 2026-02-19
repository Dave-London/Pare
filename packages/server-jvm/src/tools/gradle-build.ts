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
import { parseGradleBuild } from "../lib/parsers.js";
import {
  formatGradleBuild,
  compactGradleBuildMap,
  formatGradleBuildCompact,
} from "../lib/formatters.js";
import { GradleBuildResultSchema } from "../schemas/index.js";

export function registerGradleBuildTool(server: McpServer) {
  server.registerTool(
    "gradle-build",
    {
      title: "Gradle Build",
      description:
        "Runs `gradle build` and returns structured output with diagnostics, task counts, and exit code.",
      inputSchema: {
        path: projectPathInput,
        tasks: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["build"])
          .describe("Gradle tasks to run (default: build)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Gradle arguments"),
        compact: compactInput,
      },
      outputSchema: GradleBuildResultSchema,
    },
    async ({ path, tasks, args, compact }) => {
      const cwd = path || process.cwd();
      for (const task of tasks ?? []) assertNoFlagInjection(task, "task");

      const cmdArgs = [...(tasks ?? ["build"]), ...(args ?? [])];

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

      const data = parseGradleBuild(
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
        formatGradleBuild,
        compactGradleBuildMap,
        formatGradleBuildCompact,
        compact === false,
      );
    },
  );
}
