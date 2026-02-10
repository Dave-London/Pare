import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { mypy } from "../lib/python-runner.js";
import { parseMypyOutput } from "../lib/parsers.js";
import { formatMypy } from "../lib/formatters.js";
import { MypyResultSchema } from "../schemas/index.js";

export function registerMypyTool(server: McpServer) {
  server.registerTool(
    "mypy",
    {
      title: "mypy Type Check",
      description:
        "Runs mypy and returns structured type-check diagnostics (file, line, severity, message, code). Use instead of running `mypy` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
      },
      outputSchema: MypyResultSchema,
    },
    async ({ path, targets }) => {
      const cwd = path || process.cwd();
      const args = [...(targets || ["."])];

      const result = await mypy(args, cwd);
      const data = parseMypyOutput(result.stdout, result.exitCode);
      return dualOutput(data, formatMypy);
    },
  );
}
