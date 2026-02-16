import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoBuildOutput } from "../lib/parsers.js";
import { formatGoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { GoBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Go Build",
      description:
        "Runs go build and returns structured error list (file, line, column, message). Use instead of running `go build` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("Packages to build (default: ./...)"),
        race: z.boolean().optional().default(false).describe("Enable data race detection (-race)"),
        trimpath: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Remove all file system paths from the resulting binary (-trimpath). Needed for reproducible builds.",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print the names of packages as they are compiled (-v)"),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Build tags for conditional compilation (-tags). Example: ['integration', 'linux']",
          ),
        ldflags: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            'Linker flags (-ldflags). Commonly used for version injection, e.g. "-X main.version=1.0.0"',
          ),
        output: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output binary name or path (-o)"),
        buildmode: z
          .enum(["default", "archive", "c-archive", "c-shared", "shared", "exe", "pie", "plugin"])
          .optional()
          .describe("Build mode (-buildmode). Controls the type of output artifact."),
        gcflags: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            'Arguments to pass to the Go compiler (-gcflags). Example: "-N -l" to disable optimizations.',
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoBuildResultSchema,
    },
    async ({
      path,
      packages,
      race,
      trimpath,
      verbose,
      tags,
      ldflags,
      output,
      buildmode,
      gcflags,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (output) assertNoFlagInjection(output, "output");
      const args = ["build"];
      if (race) args.push("-race");
      if (trimpath) args.push("-trimpath");
      if (verbose) args.push("-v");
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        args.push("-tags", tags.join(","));
      }
      if (ldflags) args.push("-ldflags", ldflags);
      if (output) args.push("-o", output);
      if (buildmode) args.push(`-buildmode=${buildmode}`);
      if (gcflags) args.push("-gcflags", gcflags);
      args.push(...(packages || ["./..."]));
      const result = await goCmd(args, cwd);
      const data = parseGoBuildOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
