import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { turboCmd } from "../lib/build-runner.js";
import { parseTurboOutput } from "../lib/parsers.js";
import { formatTurbo, compactTurboMap, formatTurboCompact } from "../lib/formatters.js";
import { TurboResultSchema } from "../schemas/index.js";

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
          .describe("Turbo task to run (e.g., 'build', 'test', 'lint')"),
        filter: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Package filter (e.g., '@scope/pkg' or 'pkg...')"),
        concurrency: z.number().optional().describe("Maximum number of concurrent tasks"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: TurboResultSchema,
    },
    async ({ task, filter, concurrency, path, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(task, "task");
      if (filter) assertNoFlagInjection(filter, "filter");

      const cliArgs: string[] = ["run", task, "--output-logs=new-only"];

      if (filter) cliArgs.push("--filter", filter);
      if (concurrency !== undefined) cliArgs.push("--concurrency", String(concurrency));

      const start = Date.now();
      const result = await turboCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseTurboOutput(result.stdout, result.stderr, result.exitCode, duration);
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
