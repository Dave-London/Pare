import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
  compactInput,
} from "@paretools/shared";
import { lernaCmd } from "../lib/build-runner.js";
import { parseLernaOutput } from "../lib/parsers.js";
import { formatLerna, compactLernaMap, formatLernaCompact } from "../lib/formatters.js";
import { LernaResultSchema } from "../schemas/index.js";

/** Registers the `lerna` tool on the given MCP server. */
export function registerLernaTool(server: McpServer) {
  server.registerTool(
    "lerna",
    {
      title: "lerna",
      description:
        "Runs Lerna monorepo commands (list, run, changed, version) and returns structured package information.",
      inputSchema: {
        action: z
          .enum(["list", "run", "changed", "version"])
          .describe(
            "Lerna action to perform: list (list packages), run (run script), changed (list changed packages), version (bump versions, dry-run only)",
          ),
        script: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Script name to run (required when action is 'run')"),
        scope: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Package filter pattern (e.g., '@scope/pkg' or 'pkg-*'). Maps to --scope."),
        concurrency: z
          .number()
          .optional()
          .describe("Maximum number of concurrent tasks (maps to --concurrency)"),
        dryRun: z
          .boolean()
          .optional()
          .describe(
            "Preview without making changes. Always enabled for 'version' action for safety.",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional lerna flags"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: LernaResultSchema,
    },
    async ({ action, script, scope, concurrency, dryRun, args, path, compact }) => {
      const cwd = path || process.cwd();
      if (script) assertNoFlagInjection(script, "script");
      if (scope) assertNoFlagInjection(scope, "scope");

      const cliArgs: string[] = [];

      switch (action) {
        case "list":
          cliArgs.push("list", "--json");
          break;
        case "changed":
          cliArgs.push("changed", "--json");
          break;
        case "run":
          if (!script) {
            throw new Error("script is required when action is 'run'.");
          }
          cliArgs.push("run", script);
          break;
        case "version":
          // Always dry-run for safety — version bumps should not be automated blindly
          cliArgs.push("version", "--yes", "--no-push", "--no-git-tag-version");
          break;
      }

      if (scope) cliArgs.push("--scope", scope);
      if (concurrency !== undefined) cliArgs.push("--concurrency", String(concurrency));
      if (dryRun || action === "version") cliArgs.push("--dry-run");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await lernaCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseLernaOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        action,
      );
      return compactDualOutput(
        data,
        rawOutput,
        formatLerna,
        compactLernaMap,
        formatLernaCompact,
        compact === false,
      );
    },
  );
}
