import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoModTidyOutput } from "../lib/parsers.js";
import { formatGoModTidy, compactModTidyMap, formatModTidyCompact } from "../lib/formatters.js";
import { GoModTidyResultSchema } from "../schemas/index.js";

/** Registers the `mod-tidy` tool on the given MCP server. */
export function registerModTidyTool(server: McpServer) {
  server.registerTool(
    "mod-tidy",
    {
      title: "Go Mod Tidy",
      description:
        "Runs go mod tidy to add missing and remove unused module dependencies. Use instead of running `go mod tidy` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoModTidyResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const result = await goCmd(["mod", "tidy"], cwd);
      const data = parseGoModTidyOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoModTidy,
        compactModTidyMap,
        formatModTidyCompact,
        compact === false,
      );
    },
  );
}
