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
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { SwiftRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Swift Run",
      description:
        "Runs a Swift executable and returns structured output (exit code, stdout, stderr).",
      inputSchema: {
        executable: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Name of the executable product to run"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Arguments to pass to the executable"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftRunResultSchema,
    },
    async ({ executable, args, path, compact }) => {
      const cwd = path || process.cwd();
      if (executable) assertNoFlagInjection(executable, "executable");

      const cmdArgs = ["run"];
      if (executable) cmdArgs.push(executable);
      if (args && args.length > 0) {
        cmdArgs.push("--");
        cmdArgs.push(...args);
      }

      const start = Date.now();
      let timedOut = false;
      let result;
      try {
        result = await swiftCmd(cmdArgs, cwd);
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

      const data = parseRunOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
