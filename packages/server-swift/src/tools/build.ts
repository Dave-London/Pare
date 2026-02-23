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
import { parseBuildOutput } from "../lib/parsers.js";
import { formatBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { SwiftBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Swift Build",
      description: "Builds a Swift package and returns structured compiler diagnostics.",
      inputSchema: {
        configuration: z
          .enum(["debug", "release"])
          .optional()
          .describe("Build configuration (debug or release)"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific target to build"),
        product: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific product to build"),
        verbose: z.boolean().optional().default(false).describe("Enable verbose output (-v)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: SwiftBuildResultSchema,
    },
    async ({ configuration, target, product, verbose, path, compact }) => {
      const cwd = path || process.cwd();
      if (target) assertNoFlagInjection(target, "target");
      if (product) assertNoFlagInjection(product, "product");

      const cmdArgs = ["build"];
      if (configuration) cmdArgs.push("-c", configuration);
      if (target) cmdArgs.push("--target", target);
      if (product) cmdArgs.push("--product", product);
      if (verbose) cmdArgs.push("-v");

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

      const data = parseBuildOutput(
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
        formatBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
