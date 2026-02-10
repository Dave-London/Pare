import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { eslint } from "../lib/lint-runner.js";
import { parseEslintJson } from "../lib/parsers.js";
import { formatLint } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

export function registerLintTool(server: McpServer) {
  server.registerTool(
    "lint",
    {
      title: "ESLint Check",
      description:
        "Runs ESLint and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `eslint` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("File patterns to lint (default: ['.'])"),
        fix: z.boolean().optional().default(false).describe("Auto-fix problems"),
      },
      outputSchema: LintResultSchema,
    },
    async ({ path, patterns, fix }) => {
      const cwd = path || process.cwd();
      const args = ["--format", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");

      const result = await eslint(args, cwd);
      const data = parseEslintJson(result.stdout);
      return dualOutput(data, formatLint);
    },
  );
}
