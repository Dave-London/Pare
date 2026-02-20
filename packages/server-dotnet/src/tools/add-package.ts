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
import { parseDotnetAddPackageOutput } from "../lib/parsers.js";
import {
  formatDotnetAddPackage,
  compactAddPackageMap,
  formatAddPackageCompact,
} from "../lib/formatters.js";
import { DotnetAddPackageResultSchema } from "../schemas/index.js";

/** Registers the `add-package` tool on the given MCP server. */
export function registerAddPackageTool(server: McpServer) {
  server.registerTool(
    "add-package",
    {
      title: ".NET Add Package",
      description:
        "Runs dotnet add package to add a NuGet package and returns structured results. WARNING: may execute untrusted code.",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the project file"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("NuGet package name to add"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package version to install (--version)"),
        prerelease: z
          .boolean()
          .optional()
          .default(false)
          .describe("Allow prerelease packages (--prerelease)"),
        source: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("NuGet package source URI to use (--source)"),
        noRestore: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip automatic restore after adding (--no-restore)"),
        compact: compactInput,
      },
      outputSchema: DotnetAddPackageResultSchema,
    },
    async ({
      path,
      project,
      package: packageName,
      version,
      prerelease,
      source,
      noRestore,
      compact,
    }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(packageName, "package");
      if (project) assertNoFlagInjection(project, "project");
      if (version) assertNoFlagInjection(version, "version");
      if (source) assertNoFlagInjection(source, "source");

      const args = ["add"];
      if (project) args.push(project);
      args.push("package", packageName);
      if (version) args.push("--version", version);
      if (prerelease) args.push("--prerelease");
      if (source) args.push("--source", source);
      if (noRestore) args.push("--no-restore");

      const result = await dotnet(args, cwd);
      const data = parseDotnetAddPackageOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        packageName,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetAddPackage,
        compactAddPackageMap,
        formatAddPackageCompact,
        compact === false,
      );
    },
  );
}
