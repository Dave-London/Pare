import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvRun } from "../lib/parsers.js";
import { formatUvRun, compactUvRunMap, formatUvRunCompact } from "../lib/formatters.js";
import { UvRunSchema } from "../schemas/index.js";

/** Registers the `uv-run` tool on the given MCP server. */
export function registerUvRunTool(server: McpServer) {
  server.registerTool(
    "uv-run",
    {
      title: "uv Run",
      description:
        "Runs a command in a uv-managed environment and returns structured output. Use instead of running `uv run` in the terminal.",
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
        isolated: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run in a clean isolated environment (--isolated)"),
        module: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run as python -m <module> instead of a script (-m)"),
        noSync: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip syncing the environment for faster execution (--no-sync)"),
        locked: z
          .boolean()
          .optional()
          .default(false)
          .describe("Assert the lockfile is up-to-date (--locked)"),
        frozen: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run without updating the lockfile (--frozen)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: UvRunSchema,
    },
    async ({ path, command, isolated, module, noSync, locked, frozen, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(command[0], "command");
      const args = ["run"];
      if (isolated) args.push("--isolated");
      if (module) args.push("-m");
      if (noSync) args.push("--no-sync");
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      args.push(...command);

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
