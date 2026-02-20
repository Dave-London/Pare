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
import { parseDotnetCleanOutput } from "../lib/parsers.js";
import { formatDotnetClean, compactCleanMap, formatCleanCompact } from "../lib/formatters.js";
import { DotnetCleanResultSchema } from "../schemas/index.js";

/** Registers the `clean` tool on the given MCP server. */
export function registerCleanTool(server: McpServer) {
  server.registerTool(
    "clean",
    {
      title: ".NET Clean",
      description: "Runs dotnet clean to remove build outputs and returns structured results.",
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
          .describe("Build configuration to clean (e.g. Debug, Release)"),
        framework: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target framework to clean (e.g. net8.0)"),
        verbosity: z
          .enum(["quiet", "minimal", "normal", "detailed", "diagnostic"])
          .optional()
          .describe("MSBuild verbosity level"),
        compact: compactInput,
      },
      outputSchema: DotnetCleanResultSchema,
    },
    async ({ path, project, configuration, framework, verbosity, compact }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (configuration) assertNoFlagInjection(configuration, "configuration");
      if (framework) assertNoFlagInjection(framework, "framework");

      const args = ["clean"];
      if (project) args.push(project);
      if (configuration) args.push("--configuration", configuration);
      if (framework) args.push("--framework", framework);
      if (verbosity) args.push("--verbosity", verbosity);

      const result = await dotnet(args, cwd);
      const data = parseDotnetCleanOutput(result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetClean,
        compactCleanMap,
        formatCleanCompact,
        compact === false,
      );
    },
  );
}
