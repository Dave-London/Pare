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
        select: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes or prefixes to enable (e.g. ['E', 'F401'])"),
        ignore: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes or prefixes to suppress (e.g. ['E501'])"),
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
          .describe("File patterns to exclude from checking"),
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
      select,
      ignore,
      config,
      targetVersion,
      exclude,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      if (config) assertNoFlagInjection(config, "config");
      if (targetVersion) assertNoFlagInjection(targetVersion, "targetVersion");
      for (const s of select ?? []) {
        assertNoFlagInjection(s, "select");
      }
      for (const i of ignore ?? []) {
        assertNoFlagInjection(i, "ignore");
      }
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }

      const args = ["check", "--output-format", "json", ...(targets || ["."])];
      if (fix) args.push("--fix");
      if (unsafeFixes) args.push("--unsafe-fixes");
      if (diff) args.push("--diff");
      if (preview) args.push("--preview");
      if (lineLength !== undefined) args.push("--line-length", String(lineLength));
      if (noCache) args.push("--no-cache");
      if (statistics) args.push("--statistics");
      if (select && select.length > 0) args.push("--select", select.join(","));
      if (ignore && ignore.length > 0) args.push("--ignore", ignore.join(","));
      if (config) args.push("--config", config);
      if (targetVersion) args.push("--target-version", targetVersion);
      for (const e of exclude ?? []) {
        args.push("--exclude", e);
      }

      const result = await ruff(args, cwd);
      const data = parseRuffJson(result.stdout, result.exitCode, result.stderr);
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
