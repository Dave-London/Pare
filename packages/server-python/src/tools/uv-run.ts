import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvRun } from "../lib/parsers.js";
import { formatUvRun, compactUvRunMap, formatUvRunCompact } from "../lib/formatters.js";
import { UvRunSchema } from "../schemas/index.js";

export function registerUvRunTool(server: McpServer) {
  server.registerTool(
    "uv-run",
    {
      title: "uv Run",
      description:
        "Runs a command in a uv-managed environment and returns structured output.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        command: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .min(1)
          .describe("Command and arguments to run (e.g. ['python', 'script.py'])"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: UvRunSchema,
    },
    async ({ path, command, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(command[0], "command");
      const args = ["run", ...command];

      const start = Date.now();
      const result = await uv(args, cwd);
      const elapsed = Date.now() - start;

      const data = parseUvRun(result.stdout, result.stderr, result.exitCode, elapsed);
      return compactDualOutput(
        data,
        result.stdout,
        formatUvRun,
        compactUvRunMap,
        formatUvRunCompact,
        compact === false,
      );
    },
  );
}
