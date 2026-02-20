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
import { parseMavenBuild } from "../lib/parsers.js";
import {
  formatMavenBuild,
  compactMavenBuildMap,
  formatMavenBuildCompact,
} from "../lib/formatters.js";
import { MavenBuildResultSchema } from "../schemas/index.js";

export function registerMavenBuildTool(server: McpServer) {
  server.registerTool(
    "maven-build",
    {
      title: "Maven Build",
      description:
        "Runs `mvn package` (or specified goals) and returns structured build output with diagnostics.",
      inputSchema: {
        path: projectPathInput,
        goals: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["package"])
          .describe("Maven goals to run (default: package)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Maven arguments"),
        compact: compactInput,
      },
      outputSchema: MavenBuildResultSchema,
    },
    async ({ path, goals, args, compact }) => {
      const cwd = path || process.cwd();
      for (const goal of goals ?? []) assertNoFlagInjection(goal, "goal");

      const cmdArgs = [...(goals ?? ["package"]), ...(args ?? [])];

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

      const data = parseMavenBuild(
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
        formatMavenBuild,
        compactMavenBuildMap,
        formatMavenBuildCompact,
        compact === false,
      );
    },
  );
}
