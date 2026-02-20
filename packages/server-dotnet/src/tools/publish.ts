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
import { parseDotnetPublishOutput } from "../lib/parsers.js";
import { formatDotnetPublish, compactPublishMap, formatPublishCompact } from "../lib/formatters.js";
import { DotnetPublishResultSchema } from "../schemas/index.js";

/** Registers the `publish` tool on the given MCP server. */
export function registerPublishTool(server: McpServer) {
  server.registerTool(
    "publish",
    {
      title: ".NET Publish",
      description:
        "Runs dotnet publish for deployment and returns structured output with output path and diagnostics.",
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
        output: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output directory for published files (-o)"),
        selfContained: z
          .boolean()
          .optional()
          .describe("Publish as self-contained deployment (--self-contained)"),
        noRestore: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip automatic restore before publishing (--no-restore)"),
        noBuild: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip build before publishing (--no-build)"),
        compact: compactInput,
      },
      outputSchema: DotnetPublishResultSchema,
    },
    async ({
      path,
      project,
      configuration,
      framework,
      runtime,
      output,
      selfContained,
      noRestore,
      noBuild,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (configuration) assertNoFlagInjection(configuration, "configuration");
      if (framework) assertNoFlagInjection(framework, "framework");
      if (runtime) assertNoFlagInjection(runtime, "runtime");
      if (output) assertNoFlagInjection(output, "output");

      const args = ["publish"];
      if (project) args.push(project);
      if (configuration) args.push("--configuration", configuration);
      if (framework) args.push("--framework", framework);
      if (runtime) args.push("--runtime", runtime);
      if (output) args.push("-o", output);
      if (selfContained === true) args.push("--self-contained");
      if (selfContained === false) args.push("--no-self-contained");
      if (noRestore) args.push("--no-restore");
      if (noBuild) args.push("--no-build");

      const result = await dotnet(args, cwd);
      const data = parseDotnetPublishOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetPublish,
        compactPublishMap,
        formatPublishCompact,
        compact === false,
      );
    },
  );
}
