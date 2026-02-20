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
import { parseDotnetRestoreOutput } from "../lib/parsers.js";
import { formatDotnetRestore, compactRestoreMap, formatRestoreCompact } from "../lib/formatters.js";
import { DotnetRestoreResultSchema } from "../schemas/index.js";

/** Registers the `restore` tool on the given MCP server. */
export function registerRestoreTool(server: McpServer) {
  server.registerTool(
    "restore",
    {
      title: ".NET Restore",
      description:
        "Runs dotnet restore to restore NuGet dependencies and returns structured results.",
      inputSchema: {
        path: projectPathInput,
        project: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to the project or solution file"),
        source: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("NuGet package source URIs to use (--source)"),
        locked: z
          .boolean()
          .optional()
          .default(false)
          .describe("Require lock file is up to date (--locked-mode)"),
        verbosity: z
          .enum(["quiet", "minimal", "normal", "detailed", "diagnostic"])
          .optional()
          .describe("MSBuild verbosity level"),
        compact: compactInput,
      },
      outputSchema: DotnetRestoreResultSchema,
    },
    async ({ path, project, source, locked, verbosity, compact }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");

      const args = ["restore"];
      if (project) args.push(project);
      if (source) {
        for (const s of source) {
          assertNoFlagInjection(s, "source");
          args.push("--source", s);
        }
      }
      if (locked) args.push("--locked-mode");
      if (verbosity) args.push("--verbosity", verbosity);

      const result = await dotnet(args, cwd);
      const data = parseDotnetRestoreOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatDotnetRestore,
        compactRestoreMap,
        formatRestoreCompact,
        compact === false,
      );
    },
  );
}
