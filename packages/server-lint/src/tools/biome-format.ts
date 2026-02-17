import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { biome } from "../lib/lint-runner.js";
import { parseBiomeFormat } from "../lib/parsers.js";
import {
  formatFormatWrite,
  compactFormatWriteMap,
  formatFormatWriteCompact,
} from "../lib/formatters.js";
import { FormatWriteResultSchema } from "../schemas/index.js";

/** Registers the `biome-format` tool on the given MCP server. */
export function registerBiomeFormatTool(server: McpServer) {
  server.registerTool(
    "biome-format",
    {
      title: "Biome Format",
      description:
        "Formats files with Biome (format --write) and returns a structured list of changed files.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
        changed: z
          .boolean()
          .optional()
          .describe("Only format VCS-changed files (maps to --changed)"),
        staged: z.boolean().optional().describe("Only format staged files (maps to --staged)"),
        since: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Only format files changed since this git ref (maps to --since)"),
        configPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Biome configuration file (maps to --config-path)"),
        indentStyle: z
          .enum(["tab", "space"])
          .optional()
          .describe("Indent style override (tab or space)"),
        lineWidth: z.number().optional().describe("Line width override"),
        quoteStyle: z
          .enum(["single", "double"])
          .optional()
          .describe("Quote style override (single or double)"),
        semicolons: z
          .enum(["always", "asNeeded"])
          .optional()
          .describe("Semicolon style (always or asNeeded)"),
        lineEnding: z.enum(["lf", "crlf", "cr"]).optional().describe("Line ending style"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: FormatWriteResultSchema,
    },
    async ({
      path,
      patterns,
      changed,
      staged,
      since,
      configPath,
      indentStyle,
      lineWidth,
      quoteStyle,
      semicolons,
      lineEnding,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["format", "--write", "--reporter=json"];
      if (changed) args.push("--changed");
      if (staged) args.push("--staged");
      if (since) {
        assertNoFlagInjection(since, "since");
        args.push(`--since=${since}`);
      }
      if (configPath) {
        assertNoFlagInjection(configPath, "configPath");
        args.push(`--config-path=${configPath}`);
      }
      if (indentStyle) args.push(`--indent-style=${indentStyle}`);
      if (lineWidth !== undefined) args.push(`--line-width=${lineWidth}`);
      if (quoteStyle) args.push(`--quote-style=${quoteStyle}`);
      if (semicolons) args.push(`--semicolons=${semicolons}`);
      if (lineEnding) args.push(`--line-ending=${lineEnding}`);
      args.push(...(patterns || ["."]));

      const result = await biome(args, cwd);
      const data = parseBiomeFormat(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatFormatWrite,
        compactFormatWriteMap,
        formatFormatWriteCompact,
        compact === false,
      );
    },
  );
}
