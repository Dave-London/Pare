import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoModTidyOutput } from "../lib/parsers.js";
import { formatGoModTidy, compactModTidyMap, formatModTidyCompact } from "../lib/formatters.js";
import { GoModTidyResultSchema } from "../schemas/index.js";

export function registerModTidyTool(server: McpServer) {
  server.registerTool(
    "mod-tidy",
    {
      title: "Go Mod Tidy",
      description:
        "Runs go mod tidy to add missing and remove unused module dependencies.",
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
            "Prefer compact output",
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
