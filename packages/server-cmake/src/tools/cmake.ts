import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  assertAllowedByPolicy,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { z } from "zod";
import { cmakeCmd, ctestCmd } from "../lib/cmake-runner.js";
import {
  parseCMakeConfigureOutput,
  parseCMakeBuildOutput,
  parseCTestOutput,
  parseCMakePresetsOutput,
  parseCMakeInstallOutput,
  parseCMakeCleanOutput,
} from "../lib/parsers.js";
import {
  formatConfigure,
  compactConfigureMap,
  formatConfigureCompact,
  formatBuild,
  compactBuildMap,
  formatBuildCompact,
  formatTest,
  compactTestMap,
  formatTestCompact,
  formatPresets,
  compactPresetsMap,
  formatPresetsCompact,
  formatInstall,
  compactInstallMap,
  formatInstallCompact,
  formatClean,
  compactCleanMap,
  formatCleanCompact,
} from "../lib/formatters.js";
import { CMakeResultSchema } from "../schemas/index.js";

/** Registers the `cmake` tool on the given MCP server. */
export function registerCMakeTool(server: McpServer) {
  server.registerTool(
    "cmake",
    {
      title: "CMake",
      description:
        "CMake build system operations: configure, build, test, list-presets, install, clean.",
      inputSchema: {
        action: z
          .enum(["configure", "build", "test", "list-presets", "install", "clean"])
          .describe("CMake action"),
        sourceDir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Source directory containing CMakeLists.txt"),
        buildDir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .default("build")
          .describe("Build directory"),
        cacheVars: z
          .record(z.string(), z.string())
          .optional()
          .describe("CMake cache variables (-D KEY=VALUE)"),
        target: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(20)
          .optional()
          .describe("Build targets"),
        config: z
          .enum(["Debug", "Release", "RelWithDebInfo", "MinSizeRel"])
          .optional()
          .describe("Build configuration"),
        testOutputOnFailure: z
          .boolean()
          .optional()
          .default(true)
          .describe("Show output for failed tests"),
        compact: compactInput,
      },
      outputSchema: CMakeResultSchema,
    },
    async ({
      action,
      sourceDir,
      buildDir,
      cacheVars,
      target,
      config,
      testOutputOnFailure,
      compact,
    }) => {
      // Validate inputs
      if (sourceDir) assertNoFlagInjection(sourceDir, "sourceDir");
      if (buildDir) assertNoFlagInjection(buildDir, "buildDir");
      if (target) {
        for (const t of target) assertNoFlagInjection(t, "target");
      }

      // Validate cache variable keys
      if (cacheVars) {
        const keyRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
        for (const key of Object.keys(cacheVars)) {
          if (!keyRegex.test(key)) {
            throw new Error(`Invalid cache variable key: "${key}"`);
          }
        }
      }

      // install requires policy gate
      if (action === "install") {
        assertAllowedByPolicy("cmake", "cmake");
      }

      const bDir = buildDir || "build";
      const cwd = sourceDir || process.cwd();

      switch (action) {
        case "configure": {
          const args = ["-S", sourceDir || ".", "-B", bDir];
          if (config) args.push(`-DCMAKE_BUILD_TYPE=${config}`);
          if (cacheVars) {
            for (const [key, value] of Object.entries(cacheVars)) {
              args.push(`-D${key}=${value}`);
            }
          }
          const result = await cmakeCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCMakeConfigureOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            bDir,
          );
          return compactDualOutput(
            data,
            rawOutput,
            formatConfigure,
            compactConfigureMap,
            formatConfigureCompact,
            compact === false,
          );
        }
        case "build": {
          const args = ["--build", bDir];
          if (target) {
            for (const t of target) {
              args.push("--target", t);
            }
          }
          if (config) args.push("--config", config);
          const result = await cmakeCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCMakeBuildOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatBuild,
            compactBuildMap,
            formatBuildCompact,
            compact === false,
          );
        }
        case "test": {
          const args = ["--test-dir", bDir];
          if (testOutputOnFailure) args.push("--output-on-failure");
          if (config) args.push("-C", config);
          const result = await ctestCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCTestOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatTest,
            compactTestMap,
            formatTestCompact,
            compact === false,
          );
        }
        case "list-presets": {
          const args = ["--list-presets=all"];
          const result = await cmakeCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCMakePresetsOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatPresets,
            compactPresetsMap,
            formatPresetsCompact,
            compact === false,
          );
        }
        case "install": {
          const args = ["--install", bDir];
          if (config) args.push("--config", config);
          const result = await cmakeCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCMakeInstallOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatInstall,
            compactInstallMap,
            formatInstallCompact,
            compact === false,
          );
        }
        case "clean": {
          const args = ["--build", bDir, "--target", "clean"];
          const result = await cmakeCmd(args, cwd);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          const data = parseCMakeCleanOutput(result.stdout, result.stderr, result.exitCode);
          return compactDualOutput(
            data,
            rawOutput,
            formatClean,
            compactCleanMap,
            formatCleanCompact,
            compact === false,
          );
        }
      }
    },
  );
}
