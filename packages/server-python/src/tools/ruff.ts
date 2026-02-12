import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ruff } from "../lib/python-runner.js";
import { parseRuffJson } from "../lib/parsers.js";
import { formatRuff, compactRuffMap, formatRuffCompact } from "../lib/formatters.js";
import { RuffResultSchema } from "../schemas/index.js";

export function registerRuffTool(server: McpServer) {
  server.registerTool(
    "ruff-check",
    {
      title: "ruff Lint",
      description:
        "Runs ruff check and returns structured lint diagnostics (file, line, code, message). Use instead of running `ruff check` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        fix: z.boolean().optional().default(false).describe("Auto-fix problems"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: RuffResultSchema,
    },
    async ({ path, targets, fix, compact }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      const args = ["check", "--output-format", "json", ...(targets || ["."])];
      if (fix) args.push("--fix");

      const result = await ruff(args, cwd);
      const data = parseRuffJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatRuff,
        compactRuffMap,
        formatRuffCompact,
        compact === false,
      );
    },
  );
}
