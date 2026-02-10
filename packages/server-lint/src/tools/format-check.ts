import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { prettier } from "../lib/lint-runner.js";
import { parsePrettierCheck } from "../lib/parsers.js";
import { formatFormatCheck } from "../lib/formatters.js";
import { FormatCheckResultSchema } from "../schemas/index.js";

export function registerFormatCheckTool(server: McpServer) {
  server.registerTool(
    "format-check",
    {
      title: "Prettier Check",
      description:
        "Checks if files are formatted and returns a structured list of files needing formatting. Use instead of running `prettier --check` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("File patterns to check (default: ['.'])"),
      },
      outputSchema: FormatCheckResultSchema,
    },
    async ({ path, patterns }) => {
      const cwd = path || process.cwd();
      const args = ["--check", ...(patterns || ["."])];

      const result = await prettier(args, cwd);
      const data = parsePrettierCheck(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatFormatCheck);
    },
  );
}
