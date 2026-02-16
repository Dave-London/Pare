import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertAllowedCommand,
  assertNoPathQualifiedCommand,
  assertNoFlagInjection,
  assertAllowedRoot,
  INPUT_LIMITS,
} from "@paretools/shared";
import { runBuildCommand } from "../lib/build-runner.js";
import { parseBuildCommandOutput } from "../lib/parsers.js";
import { formatBuildCommand, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { BuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Run Build",
      description:
        "Runs a build command and returns structured success/failure with errors and warnings. Use instead of running build commands in the terminal. " +
        "Allowed commands: ant, bazel, bun, bunx, cargo, cmake, dotnet, esbuild, go, gradle, gradlew, make, msbuild, mvn, npm, npx, nx, pnpm, rollup, tsc, turbo, vite, webpack, yarn.",
      inputSchema: {
        command: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Build command to run (e.g., 'npm', 'npx', 'pnpm')"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .default([])
          .describe("Arguments for the build command (e.g., ['run', 'build'])"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: BuildResultSchema,
    },
    async ({ command, args, path, compact }) => {
      assertAllowedCommand(command);
      assertNoPathQualifiedCommand(command);
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "build");
      const start = Date.now();
      const result = await runBuildCommand(command, args || [], cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseBuildCommandOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        rawOutput,
        formatBuildCommand,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
