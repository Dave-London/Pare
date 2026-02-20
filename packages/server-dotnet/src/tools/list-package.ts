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
import { parseDotnetListPackageOutput } from "../lib/parsers.js";
import {
  formatDotnetListPackage,
  compactListPackageMap,
  formatListPackageCompact,
} from "../lib/formatters.js";
import { DotnetListPackageResultSchema } from "../schemas/index.js";

/** Registers the `list-package` tool on the given MCP server. */
export function registerListPackageTool(server: McpServer) {
  server.registerTool(
    "list-package",
    {
      title: ".NET List Packages",
      description:
        "Runs dotnet list package and returns structured NuGet package listings per project and framework.",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the project or solution file"),
        outdated: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show outdated packages (--outdated)"),
        deprecated: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show deprecated packages (--deprecated)"),
        vulnerable: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show packages with known vulnerabilities (--vulnerable)"),
        includeTransitive: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include transitive packages (--include-transitive)"),
        format: z
          .enum(["json", "text"])
          .optional()
          .describe("Output format. JSON is preferred for structured parsing (--format json)"),
        source: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("NuGet package source URI for version checks (--source)"),
        compact: compactInput,
      },
      outputSchema: DotnetListPackageResultSchema,
    },
    async ({
      path,
      project,
      outdated,
      deprecated,
      vulnerable,
      includeTransitive,
      format,
      source,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");
      if (source) assertNoFlagInjection(source, "source");

      const args = ["list"];
      if (project) args.push(project);
      args.push("package");
      if (outdated) args.push("--outdated");
      if (deprecated) args.push("--deprecated");
      if (vulnerable) args.push("--vulnerable");
      if (includeTransitive) args.push("--include-transitive");
      if (format) args.push("--format", format);
      if (source) args.push("--source", source);

      const result = await dotnet(args, cwd);
      const data = parseDotnetListPackageOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetListPackage,
        compactListPackageMap,
        formatListPackageCompact,
        compact === false,
      );
    },
  );
}
