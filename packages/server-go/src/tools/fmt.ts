import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { gofmtCmd } from "../lib/go-runner.js";
import { parseGoFmtOutput } from "../lib/parsers.js";
import { formatGoFmt } from "../lib/formatters.js";
import { GoFmtResultSchema } from "../schemas/index.js";

export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Go Fmt",
      description:
        "Checks or fixes Go source formatting using gofmt. In check mode (-l), lists unformatted files. In fix mode (-w), rewrites files. Use instead of running `gofmt` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string())
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check mode: list unformatted files without fixing (default: false)"),
      },
      outputSchema: GoFmtResultSchema,
    },
    async ({ path, patterns, check }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const flag = check ? "-l" : "-w";
      const args = [flag, ...(patterns || ["."])];
      const result = await gofmtCmd(args, cwd);
      const data = parseGoFmtOutput(result.stdout, result.stderr, result.exitCode, !!check);
      return dualOutput(data, formatGoFmt);
    },
  );
}
