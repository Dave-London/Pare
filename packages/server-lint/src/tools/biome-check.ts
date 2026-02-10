import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { biome } from "../lib/lint-runner.js";
import { parseBiomeJson } from "../lib/parsers.js";
import { formatLint } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

export function registerBiomeCheckTool(server: McpServer) {
  server.registerTool(
    "biome-check",
    {
      title: "Biome Check",
      description:
        "Runs Biome check (lint + format) and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `biome check` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("File patterns to check (default: ['.'])"),
      },
      outputSchema: LintResultSchema,
    },
    async ({ path, patterns }) => {
      const cwd = path || process.cwd();
      const args = ["check", "--reporter=json", ...(patterns || ["."])];

      const result = await biome(args, cwd);
      const data = parseBiomeJson(result.stdout);
      return dualOutput(data, formatLint);
    },
  );
}
