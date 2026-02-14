import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { nxCmd } from "../lib/build-runner.js";
import { parseNxOutput } from "../lib/parsers.js";
import { formatNx, compactNxMap, formatNxCompact } from "../lib/formatters.js";
import { NxResultSchema } from "../schemas/index.js";

export function registerNxTool(server: McpServer) {
  server.registerTool(
    "nx",
    {
      title: "nx",
      description:
        "Runs Nx workspace commands and returns structured per-project task results with cache status. Use instead of running `nx` in the terminal.",
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
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to nx"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: NxResultSchema,
    },
    async ({ target, project, affected, base, path, args, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(target, "target");
      if (project) assertNoFlagInjection(project, "project");
      if (base) assertNoFlagInjection(base, "base");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cliArgs: string[] = [];

      if (affected) {
        cliArgs.push("affected", `--target=${target}`);
        if (base) cliArgs.push(`--base=${base}`);
      } else if (project) {
        cliArgs.push("run", `${project}:${target}`);
      } else {
        cliArgs.push("run-many", `--target=${target}`);
      }

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await nxCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseNxOutput(result.stdout, result.stderr, result.exitCode, duration);
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
