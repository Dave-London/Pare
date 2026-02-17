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

export function registerBiomeFormatTool(server: McpServer) {
  server.registerTool(
    "biome-format",
    {
      title: "Biome Format",
      description:
        "Formats files with Biome (format --write) and returns a structured list of changed files.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: FormatWriteResultSchema,
    },
    async ({ path, patterns, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["format", "--write", ...(patterns || ["."])];

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
