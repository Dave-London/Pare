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
import { parseDotnetTestOutput } from "../lib/parsers.js";
import { formatDotnetTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { DotnetTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: ".NET Test",
      description:
        "Runs dotnet test and returns structured test results (name, status, pass/fail counts).",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the test project or solution file"),
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Filter expression to select tests (--filter)"),
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
        noRestore: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip automatic restore before testing (--no-restore)"),
        noBuild: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip build before testing (--no-build)"),
        verbosity: z
          .enum(["quiet", "minimal", "normal", "detailed", "diagnostic"])
          .optional()
          .describe("MSBuild verbosity level"),
        compact: compactInput,
      },
      outputSchema: DotnetTestResultSchema,
    },
    async ({
      path,
      project,
      filter,
      configuration,
      framework,
      noRestore,
      noBuild,
      verbosity,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (filter) assertNoFlagInjection(filter, "filter");
      if (configuration) assertNoFlagInjection(configuration, "configuration");
      if (framework) assertNoFlagInjection(framework, "framework");

      const args = ["test", "--logger", "console;verbosity=detailed"];
      if (project) args.push(project);
      if (filter) args.push("--filter", filter);
      if (configuration) args.push("--configuration", configuration);
      if (framework) args.push("--framework", framework);
      if (noRestore) args.push("--no-restore");
      if (noBuild) args.push("--no-build");
      if (verbosity) args.push("--verbosity", verbosity);

      const result = await dotnet(args, cwd);
      const data = parseDotnetTestOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
