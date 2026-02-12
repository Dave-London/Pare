import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvRun } from "../lib/parsers.js";
import { formatUvRun } from "../lib/formatters.js";
import { UvRunSchema } from "../schemas/index.js";

export function registerUvRunTool(server: McpServer) {
  server.registerTool(
    "uv-run",
    {
      title: "uv Run",
      description:
        "Runs a command in a uv-managed environment and returns structured output. Use instead of running `uv run` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Working directory (default: cwd)"),
        command: z
          .array(z.string())
          .min(1)
          .describe("Command and arguments to run (e.g. ['python', 'script.py'])"),
      },
      outputSchema: UvRunSchema,
    },
    async ({ path, command }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(command[0], "command");
      const args = ["run", ...command];

      const start = Date.now();
      const result = await uv(args, cwd);
      const elapsed = Date.now() - start;

      const data = parseUvRun(result.stdout, result.stderr, result.exitCode, elapsed);
      return dualOutput(data, formatUvRun);
    },
  );
}
