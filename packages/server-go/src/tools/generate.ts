import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGenerateOutput } from "../lib/parsers.js";
import { formatGoGenerate, compactGenerateMap, formatGenerateCompact } from "../lib/formatters.js";
import { GoGenerateResultSchema } from "../schemas/index.js";

export function registerGenerateTool(server: McpServer) {
  server.registerTool(
    "generate",
    {
      title: "Go Generate",
      description:
        "Runs go generate directives in Go source files. Use instead of running `go generate` in the terminal. WARNING: `go generate` executes arbitrary commands embedded in //go:generate directives in source files. Only use this tool on trusted code that you have reviewed.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("Packages to generate (default: ./...)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoGenerateResultSchema,
    },
    async ({ path, patterns, compact }) => {
      for (const p of patterns || []) {
        assertNoFlagInjection(p, "patterns");
      }
      const cwd = path || process.cwd();
      const result = await goCmd(["generate", ...(patterns || ["./..."])], cwd);
      const data = parseGoGenerateOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoGenerate,
        compactGenerateMap,
        formatGenerateCompact,
        compact === false,
      );
    },
  );
}
