import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { ruff } from "../lib/python-runner.js";
import { parseRuffJson } from "../lib/parsers.js";
import { formatRuff } from "../lib/formatters.js";
import { RuffResultSchema } from "../schemas/index.js";

export function registerRuffTool(server: McpServer) {
  server.registerTool(
    "ruff-check",
    {
      title: "ruff Lint",
      description:
        "Runs ruff check and returns structured lint diagnostics (file, line, code, message)",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        fix: z.boolean().optional().default(false).describe("Auto-fix problems"),
      },
      outputSchema: RuffResultSchema,
    },
    async ({ path, targets, fix }) => {
      const cwd = path || process.cwd();
      const args = ["check", "--output-format", "json", ...(targets || ["."])];
      if (fix) args.push("--fix");

      const result = await ruff(args, cwd);
      const data = parseRuffJson(result.stdout);
      return dualOutput(data, formatRuff);
    },
  );
}
