import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
  compactInput,
} from "@paretools/shared";
import { dotnet } from "../lib/dotnet-runner.js";
import { parseDotnetBuildOutput } from "../lib/parsers.js";
import { formatDotnetBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { DotnetBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: ".NET Build",
      description:
        "Runs dotnet build and returns structured diagnostics (file, line, column, code, severity, message).",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the project or solution file"),
        configuration: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Build configuration (e.g. Debug, Release)"),
        framework: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target framework (e.g. net8.0)"),
        runtime: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target runtime identifier (e.g. win-x64, linux-x64)"),
        noRestore: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip automatic restore before building (--no-restore)"),
        verbosity: z
          .enum(["quiet", "minimal", "normal", "detailed", "diagnostic"])
          .optional()
          .describe("MSBuild verbosity level"),
        compact: compactInput,
      },
      outputSchema: DotnetBuildResultSchema,
    },
    async ({ path, project, configuration, framework, runtime, noRestore, verbosity, compact }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (configuration) assertNoFlagInjection(configuration, "configuration");
      if (framework) assertNoFlagInjection(framework, "framework");
      if (runtime) assertNoFlagInjection(runtime, "runtime");

      const args = ["build"];
      if (project) args.push(project);
      if (configuration) args.push("--configuration", configuration);
      if (framework) args.push("--framework", framework);
      if (runtime) args.push("--runtime", runtime);
      if (noRestore) args.push("--no-restore");
      if (verbosity) args.push("--verbosity", verbosity);

      const result = await dotnet(args, cwd);
      const data = parseDotnetBuildOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
