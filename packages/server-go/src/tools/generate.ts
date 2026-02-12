import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGenerateOutput } from "../lib/parsers.js";
import { formatGoGenerate } from "../lib/formatters.js";
import { GoGenerateResultSchema } from "../schemas/index.js";

export function registerGenerateTool(server: McpServer) {
  server.registerTool(
    "generate",
    {
      title: "Go Generate",
      description:
        "Runs go generate directives in Go source files. Use instead of running `go generate` in the terminal. WARNING: `go generate` executes arbitrary commands embedded in //go:generate directives in source files. Only use this tool on trusted code that you have reviewed.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["./..."])
          .describe("Packages to generate (default: ./...)"),
      },
      outputSchema: GoGenerateResultSchema,
    },
    async ({ path, patterns }) => {
      for (const p of patterns || []) {
        assertNoFlagInjection(p, "patterns");
      }
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const result = await goCmd(["generate", ...(patterns || ["./..."])], cwd);
      const data = parseGoGenerateOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatGoGenerate);
    },
  );
}
