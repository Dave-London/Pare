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

/** Registers the `ruff-format` tool on the given MCP server. */
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
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show diff of formatting changes without applying (--diff)"),
        lineLength: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the configured line length (--line-length)"),
        preview: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable preview formatting rules (--preview)"),
        noCache: z.boolean().optional().default(false).describe("Disable cache (--no-cache)"),
        isolated: z
          .boolean()
          .optional()
          .default(false)
          .describe("Ignore all configuration files (--isolated)"),
        indentWidth: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the configured indent width (--indent-width)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to custom ruff config file"),
        targetVersion: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Python version target override (e.g. 'py38')"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File patterns to exclude from formatting"),
        range: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Line range for formatting (e.g. '10-20')"),
        quoteStyle: z
          .enum(["single", "double"])
          .optional()
          .describe("Quote style override for formatting"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: RuffFormatResultSchema,
    },
    async ({
      patterns,
      check,
      diff,
      lineLength,
      preview,
      noCache,
      isolated,
      indentWidth,
      path,
      config,
      targetVersion,
      exclude,
      range,
      quoteStyle,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      if (config) assertNoFlagInjection(config, "config");
      if (targetVersion) assertNoFlagInjection(targetVersion, "targetVersion");
      if (range) assertNoFlagInjection(range, "range");
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }

      const args = ["format", ...(patterns || ["."])];
      if (check) args.push("--check");
      if (diff) args.push("--diff");
      if (lineLength !== undefined) args.push("--line-length", String(lineLength));
      if (preview) args.push("--preview");
      if (noCache) args.push("--no-cache");
      if (isolated) args.push("--isolated");
      if (indentWidth !== undefined) args.push("--indent-width", String(indentWidth));
      if (config) args.push("--config", config);
      if (targetVersion) args.push("--target-version", targetVersion);
      if (range) args.push("--range", range);
      if (quoteStyle) args.push("--config", `format.quote-style = "${quoteStyle}"`);
      for (const e of exclude ?? []) {
        args.push("--exclude", e);
      }

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
