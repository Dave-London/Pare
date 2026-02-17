import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ruff } from "../lib/python-runner.js";
import { parseRuffFormatOutput } from "../lib/parsers.js";
import {
  formatRuffFormat,
  compactRuffFormatMap,
  formatRuffFormatCompact,
} from "../lib/formatters.js";
import { RuffFormatResultSchema } from "../schemas/index.js";

export function registerRuffFormatTool(server: McpServer) {
  server.registerTool(
    "ruff-format",
    {
      title: "ruff Format",
      description: "Runs ruff format and returns structured results (files changed, file list).",
      inputSchema: {
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe('Files or directories to format (default: ["."])'),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check mode (report without modifying files)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: RuffFormatResultSchema,
    },
    async ({ patterns, check, path, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["format", ...(patterns || ["."])];
      if (check) args.push("--check");

      const result = await ruff(args, cwd);
      const data = parseRuffFormatOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stderr,
        formatRuffFormat,
        compactRuffFormatMap,
        formatRuffFormatCompact,
        compact === false,
      );
    },
  );
}
