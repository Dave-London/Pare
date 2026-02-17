import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { mypy } from "../lib/python-runner.js";
import { parseMypyOutput } from "../lib/parsers.js";
import { formatMypy, compactMypyMap, formatMypyCompact } from "../lib/formatters.js";
import { MypyResultSchema } from "../schemas/index.js";

export function registerMypyTool(server: McpServer) {
  server.registerTool(
    "mypy",
    {
      title: "mypy Type Check",
      description:
        "Runs mypy and returns structured type-check diagnostics (file, line, severity, message, code).",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: MypyResultSchema,
    },
    async ({ path, targets, compact }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      const args = [...(targets || ["."])];

      const result = await mypy(args, cwd);
      const data = parseMypyOutput(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatMypy,
        compactMypyMap,
        formatMypyCompact,
        compact === false,
      );
    },
  );
}
