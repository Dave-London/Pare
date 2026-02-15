import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { tsc } from "../lib/build-runner.js";
import { parseTscOutput } from "../lib/parsers.js";
import { formatTsc, compactTscMap, formatTscCompact } from "../lib/formatters.js";
import { TscResultSchema } from "../schemas/index.js";

/** Registers the `tsc` tool on the given MCP server. */
export function registerTscTool(server: McpServer) {
  server.registerTool(
    "tsc",
    {
      title: "TypeScript Check",
      description:
        "Runs the TypeScript compiler and returns structured diagnostics (file, line, column, code, message). Use instead of running `tsc` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        noEmit: z
          .boolean()
          .optional()
          .default(true)
          .describe("Skip emitting output files (default: true)"),
        project: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Path to tsconfig.json"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: TscResultSchema,
    },
    async ({ path, noEmit, project, compact }) => {
      const cwd = path || process.cwd();
      if (project) assertNoFlagInjection(project, "project");

      const args: string[] = [];
      if (noEmit !== false) args.push("--noEmit");
      if (project) args.push("--project", project);

      const result = await tsc(args, cwd);
      const rawOutput = result.stdout + "\n" + result.stderr;
      const data = parseTscOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        rawOutput,
        formatTsc,
        compactTscMap,
        formatTscCompact,
        compact === false,
      );
    },
  );
}
