import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { mypy } from "../lib/python-runner.js";
import { parseMypyOutput } from "../lib/parsers.js";
import { formatMypy, compactMypyMap, formatMypyCompact } from "../lib/formatters.js";
import { MypyResultSchema } from "../schemas/index.js";

/** Registers the `mypy` tool on the given MCP server. */
export function registerMypyTool(server: McpServer) {
  server.registerTool(
    "mypy",
    {
      title: "mypy Type Check",
      description:
        "Runs mypy and returns structured type-check diagnostics (file, line, severity, message, code). Use instead of running `mypy` in the terminal.",
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
        strict: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable strict mode for thorough type checking (--strict)"),
        ignoreMissingImports: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Suppress errors about missing imports for projects with incomplete stubs (--ignore-missing-imports)",
          ),
        noIncremental: z
          .boolean()
          .optional()
          .default(false)
          .describe("Disable incremental mode (--no-incremental)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: MypyResultSchema,
    },
    async ({ path, targets, strict, ignoreMissingImports, noIncremental, compact }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      const args = ["--show-error-codes", "--show-column-numbers", ...(targets || ["."])];
      if (strict) args.push("--strict");
      if (ignoreMissingImports) args.push("--ignore-missing-imports");
      if (noIncremental) args.push("--no-incremental");

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
