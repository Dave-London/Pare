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
        "Runs go generate directives in Go source files. WARNING: may execute untrusted code.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
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
            "Prefer compact output",
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
