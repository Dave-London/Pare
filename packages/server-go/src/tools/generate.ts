import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
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
        "Runs go generate directives in Go source files. Use instead of running `go generate` in the terminal.",
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
      const cwd = path || process.cwd();
      const result = await goCmd(["generate", ...(patterns || ["./..."])], cwd);
      const data = parseGoGenerateOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatGoGenerate);
    },
  );
}
