import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { turboCmd } from "../lib/build-runner.js";
import { parseTurboOutput } from "../lib/parsers.js";
import { formatTurbo, compactTurboMap, formatTurboCompact } from "../lib/formatters.js";
import { TurboResultSchema } from "../schemas/index.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Registers the `turbo` tool on the given MCP server. */
export function registerTurboTool(server: McpServer) {
  server.registerTool(
    "turbo",
    {
      title: "turbo",
      description:
        "Runs Turborepo tasks and returns structured per-package results with cache hit/miss info.",
      inputSchema: {
        task: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Turbo task to run (e.g., 'build', 'test', 'lint')."),
        tasks: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Multiple Turbo tasks to run in one invocation (e.g., ['build','test'])"),
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Package filter (e.g., '@scope/pkg' or 'pkg...')"),
        concurrency: z.number().optional().describe("Maximum number of concurrent tasks"),
        force: z
          .boolean()
          .optional()
          .describe("Bypass the turbo cache and re-run all tasks (maps to --force)"),
        continue_on_error: z
          .boolean()
          .optional()
          .describe(
            "Continue running tasks even after failures to surface all errors (maps to --continue)",
          ),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview the task graph without executing (maps to --dry-run)"),
        affected: z
          .boolean()
          .optional()
          .describe(
            "Run only tasks affected by changes since the base branch (maps to --affected)",
          ),
        graph: z
          .boolean()
          .optional()
          .describe("Generate the task graph visualization (maps to --graph)"),
        logOrder: z
          .enum(["stream", "grouped", "auto"])
          .optional()
          .describe("Order of task log output"),
        profile: z
          .boolean()
          .optional()
          .describe("Generate a performance profile (maps to --profile)"),
        summarize: z
          .boolean()
          .optional()
          .describe(
            "Generate Turbo run summary metadata and parse it into structured `summary` when available (maps to --summarize)",
          ),
        outputLogs: z
          .enum(["full", "hash-only", "new-only", "errors-only", "none"])
          .optional()
          .describe(
            "Control which task logs are shown (default: 'new-only'). Maps to --output-logs.",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Additional turbo flags passed directly to turbo (e.g., ['--env-mode=strict']).",
          ),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: TurboResultSchema,
    },
    async ({
      task,
      tasks,
      filter,
      concurrency,
      force,
      continue_on_error,
      dryRun,
      affected,
      graph,
      logOrder,
      profile,
      summarize,
      outputLogs,
      args,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const taskList = tasks && tasks.length > 0 ? tasks : task ? [task] : [];
      if (taskList.length === 0) {
        throw new Error("Either task or tasks must be provided.");
      }
      for (const selectedTask of taskList) {
        assertNoFlagInjection(selectedTask, "tasks");
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const outputLogsValue = outputLogs ?? "new-only";
      const cliArgs: string[] = ["run", ...taskList, `--output-logs=${outputLogsValue}`];

      if (filter) cliArgs.push("--filter", filter);
      if (concurrency !== undefined) cliArgs.push("--concurrency", String(concurrency));
      if (force) cliArgs.push("--force");
      if (continue_on_error) cliArgs.push("--continue");
      if (dryRun) cliArgs.push("--dry-run");
      if (affected) cliArgs.push("--affected");
      if (graph) cliArgs.push("--graph");
      if (logOrder) cliArgs.push(`--log-order=${logOrder}`);
      if (profile) cliArgs.push("--profile");
      if (summarize) cliArgs.push("--summarize");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await turboCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      let summaryJsonContent: string | undefined;
      if (summarize) {
        const combined = `${result.stdout}\n${result.stderr}`;
        const summaryPathMatch = combined.match(/(\S*\.turbo\S*\.json)/);
        const summaryPath = summaryPathMatch?.[1];
        if (summaryPath) {
          try {
            const resolvedPath = summaryPath.startsWith("/")
              ? summaryPath
              : resolve(cwd, summaryPath);
            summaryJsonContent = await readFile(resolvedPath, "utf8");
          } catch {
            // Summary file is optional; ignore read/parse failures.
          }
        }
      }

      const data = parseTurboOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        summaryJsonContent,
      );
      return compactDualOutput(
        data,
        rawOutput,
        formatTurbo,
        compactTurboMap,
        formatTurboCompact,
        compact === false,
      );
    },
  );
}
