import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { biome } from "../lib/lint-runner.js";
import { parseBiomeFormat } from "../lib/parsers.js";
import { formatFormatWrite } from "../lib/formatters.js";
import { FormatWriteResultSchema } from "../schemas/index.js";

export function registerBiomeFormatTool(server: McpServer) {
  server.registerTool(
    "biome-format",
    {
      title: "Biome Format",
      description:
        "Formats files with Biome (format --write) and returns a structured list of changed files. Use instead of running `biome format --write` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
      },
      outputSchema: FormatWriteResultSchema,
    },
    async ({ path, patterns }) => {
      const cwd = path || process.cwd();
      const args = ["format", "--write", ...(patterns || ["."])];

      const result = await biome(args, cwd);
      const data = parseBiomeFormat(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatFormatWrite);
    },
  );
}
