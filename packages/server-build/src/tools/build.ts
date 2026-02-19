import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertAllowedCommand,
  assertNoPathQualifiedCommand,
  assertNoFlagInjection,
  assertAllowedRoot,
  INPUT_LIMITS,
  cwdPathInput,
  compactInput,
} from "@paretools/shared";
import { runBuildCommand } from "../lib/build-runner.js";
import { parseBuildCommandOutput } from "../lib/parsers.js";
import { formatBuildCommand, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { BuildResultSchema } from "../schemas/index.js";

/** Max timeout cap in milliseconds (10 minutes). */
const MAX_TIMEOUT_MS = 600_000;
/** Default timeout in milliseconds (5 minutes). */
const DEFAULT_TIMEOUT_MS = 300_000;

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Run Build",
      description:
        "Runs a build command and returns structured success/failure with errors and warnings. " +
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
        path: cwdPathInput,
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(MAX_TIMEOUT_MS)
          .optional()
          .describe(
            `Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS}, max: ${MAX_TIMEOUT_MS}). Use for builds that need more or less time.`,
          ),
        env: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "Environment variables to set for the build process (e.g., { NODE_ENV: 'production', CI: 'true' }). Merged with existing environment.",
          ),
        compact: compactInput,
      },
      outputSchema: BuildResultSchema,
    },
    async ({ command, args, path, timeout, env, compact }) => {
      assertAllowedCommand(command);
      assertNoPathQualifiedCommand(command);
      // Validate env values to prevent flag injection
      const envRecord = env as Record<string, string> | undefined;
      if (envRecord) {
        for (const [key, value] of Object.entries(envRecord)) {
          assertNoFlagInjection(String(key), "env key");
          assertNoFlagInjection(String(value), "env value");
        }
      }
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "build");

      const timeoutMs = timeout ? Math.min(timeout, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;

      const start = Date.now();
      const result = await runBuildCommand(command, args || [], cwd, timeoutMs, envRecord);
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
