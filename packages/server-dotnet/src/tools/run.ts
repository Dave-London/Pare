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
import { parseDotnetRunOutput } from "../lib/parsers.js";
import { formatDotnetRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { DotnetRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: ".NET Run",
      description:
        "Runs a .NET application and returns structured output (exit code, stdout, stderr).",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the project file to run"),
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
        noBuild: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip build before running (--no-build)"),
        noRestore: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip automatic restore before running (--no-restore)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Arguments to pass to the application (after --)"),
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(600000)
          .optional()
          .describe(
            "Execution timeout in milliseconds. Overrides the default 300s. " +
              "Min: 1000 (1s), Max: 600000 (10m).",
          ),
        maxOutputSize: z
          .number()
          .int()
          .min(1024)
          .max(10485760)
          .optional()
          .default(1048576)
          .describe(
            "Maximum size in bytes for stdout/stderr before truncation. Default: 1048576 (1MB).",
          ),
        compact: compactInput,
      },
      outputSchema: DotnetRunResultSchema,
    },
    async ({
      path,
      project,
      configuration,
      framework,
      noBuild,
      noRestore,
      args,
      timeout,
      maxOutputSize,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (configuration) assertNoFlagInjection(configuration, "configuration");
      if (framework) assertNoFlagInjection(framework, "framework");

      const dotnetArgs = ["run"];
      if (project) dotnetArgs.push("--project", project);
      if (configuration) dotnetArgs.push("--configuration", configuration);
      if (framework) dotnetArgs.push("--framework", framework);
      if (noBuild) dotnetArgs.push("--no-build");
      if (noRestore) dotnetArgs.push("--no-restore");
      if (args && args.length > 0) {
        dotnetArgs.push("--", ...args);
      }

      const result = await dotnet(dotnetArgs, cwd, timeout);
      const timedOut = result.exitCode !== 0 && result.stderr?.includes("timed out");

      const data = parseDotnetRunOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        maxOutputSize,
        timedOut,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
