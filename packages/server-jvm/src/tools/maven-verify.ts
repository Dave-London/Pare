import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, projectPathInput } from "@paretools/shared";
import { mvnCmd } from "../lib/jvm-runner.js";
import { parseMavenVerify } from "../lib/parsers.js";
import {
  formatMavenVerify,
  compactMavenVerifyMap,
  formatMavenVerifyCompact,
} from "../lib/formatters.js";
import { MavenVerifyResultSchema } from "../schemas/index.js";

export function registerMavenVerifyTool(server: McpServer) {
  server.registerTool(
    "maven-verify",
    {
      title: "Maven Verify",
      description:
        "Runs `mvn verify` to execute all checks (compile, test, integration-test, verify phases) and returns structured results.",
      inputSchema: {
        path: projectPathInput,
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Maven arguments"),
        compact: compactInput,
      },
      outputSchema: MavenVerifyResultSchema,
    },
    async ({ path, args, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["verify", ...(args ?? [])];

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

      const data = parseMavenVerify(
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
        formatMavenVerify,
        compactMavenVerifyMap,
        formatMavenVerifyCompact,
        compact === false,
      );
    },
  );
}
