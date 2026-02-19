import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
  compactInput,
} from "@paretools/shared";
import { nxCmd } from "../lib/build-runner.js";
import { parseNxOutput } from "../lib/parsers.js";
import { formatNx, compactNxMap, formatNxCompact } from "../lib/formatters.js";
import { NxResultSchema } from "../schemas/index.js";

/** Registers the `nx` tool on the given MCP server. */
export function registerNxTool(server: McpServer) {
  server.registerTool(
    "nx",
    {
      title: "nx",
      description:
        "Runs Nx workspace commands and returns structured per-project task results with cache status.",
      inputSchema: {
        target: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Nx target to run (e.g., 'build', 'test', 'lint')"),
        project: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Specific project to run the target for"),
        affected: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run target only for affected projects (default: false)"),
        base: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Base ref for affected comparison (e.g., 'main')"),
        head: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Head ref for affected comparison (maps to --head)"),
        configuration: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Build configuration to use (e.g., 'production', 'development'). Maps to --configuration.",
          ),
        projects: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific projects to include in run-many (maps to --projects)"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Projects to exclude from run-many (maps to --exclude)"),
        path: projectPathInput,
        parallel: z
          .number()
          .optional()
          .describe("Max number of parallel tasks (maps to --parallel)"),
        skipNxCache: z
          .boolean()
          .optional()
          .describe("Skip the Nx cache and re-run all tasks (maps to --skip-nx-cache)"),
        nxBail: z
          .boolean()
          .optional()
          .describe("Stop task execution after the first failure (maps to --nx-bail)"),
        verbose: z
          .boolean()
          .optional()
          .describe("Enable verbose output for debugging (maps to --verbose)"),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview the task graph without executing (maps to --dry-run)"),
        outputStyle: z
          .enum(["dynamic", "static", "stream", "stream-without-prefixes", "compact"])
          .optional()
          .describe("Output style for task logs"),
        graph: z
          .boolean()
          .optional()
          .describe("Generate the task graph visualization (maps to --graph)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to nx"),
        compact: compactInput,
      },
      outputSchema: NxResultSchema,
    },
    async ({
      target,
      project,
      affected,
      base,
      head,
      configuration,
      projects,
      exclude,
      path,
      parallel,
      skipNxCache,
      nxBail,
      verbose,
      dryRun,
      outputStyle,
      graph,
      args,
      compact,
    }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(target, "target");
      if (project) assertNoFlagInjection(project, "project");
      if (base) assertNoFlagInjection(base, "base");
      if (head) assertNoFlagInjection(head, "head");
      if (configuration) assertNoFlagInjection(configuration, "configuration");

      const cliArgs: string[] = [];

      if (affected) {
        cliArgs.push("affected", `--target=${target}`);
        if (base) cliArgs.push(`--base=${base}`);
        if (head) cliArgs.push(`--head=${head}`);
      } else if (project) {
        cliArgs.push("run", `${project}:${target}`);
      } else {
        cliArgs.push("run-many", `--target=${target}`);
      }

      if (configuration) cliArgs.push(`--configuration=${configuration}`);

      if (projects && projects.length > 0) {
        for (const p of projects) {
          assertNoFlagInjection(p, "projects");
        }
        cliArgs.push(`--projects=${projects.join(",")}`);
      }

      if (exclude && exclude.length > 0) {
        for (const e of exclude) {
          assertNoFlagInjection(e, "exclude");
        }
        cliArgs.push(`--exclude=${exclude.join(",")}`);
      }

      if (parallel !== undefined) cliArgs.push(`--parallel=${parallel}`);
      if (skipNxCache) cliArgs.push("--skip-nx-cache");
      if (nxBail) cliArgs.push("--nx-bail");
      if (verbose) cliArgs.push("--verbose");
      if (dryRun) cliArgs.push("--dry-run");
      if (outputStyle) cliArgs.push(`--output-style=${outputStyle}`);
      if (graph) cliArgs.push("--graph");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await nxCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseNxOutput(result.stdout, result.stderr, result.exitCode, duration, affected);
      return compactDualOutput(
        data,
        rawOutput,
        formatNx,
        compactNxMap,
        formatNxCompact,
        compact === false,
      );
    },
  );
}
