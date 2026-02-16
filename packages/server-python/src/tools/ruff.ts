import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ruff } from "../lib/python-runner.js";
import { parseRuffJson } from "../lib/parsers.js";
import { formatRuff, compactRuffMap, formatRuffCompact } from "../lib/formatters.js";
import { RuffResultSchema } from "../schemas/index.js";

/** Registers the `ruff-check` tool on the given MCP server. */
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
        unsafeFixes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Apply unsafe fixes in addition to safe ones (--unsafe-fixes)"),
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show diff of fixes without applying (--diff)"),
        preview: z.boolean().optional().default(false).describe("Enable preview rules (--preview)"),
        lineLength: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the configured line length (--line-length)"),
        noCache: z.boolean().optional().default(false).describe("Disable cache (--no-cache)"),
        statistics: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show rule violation statistics (--statistics)"),
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
    async ({
      path,
      targets,
      fix,
      unsafeFixes,
      diff,
      preview,
      lineLength,
      noCache,
      statistics,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      const args = ["check", "--output-format", "json", ...(targets || ["."])];
      if (fix) args.push("--fix");
      if (unsafeFixes) args.push("--unsafe-fixes");
      if (diff) args.push("--diff");
      if (preview) args.push("--preview");
      if (lineLength !== undefined) args.push("--line-length", String(lineLength));
      if (noCache) args.push("--no-cache");
      if (statistics) args.push("--statistics");

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
