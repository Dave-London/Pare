import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoModTidyOutput } from "../lib/parsers.js";
import { formatGoModTidy } from "../lib/formatters.js";
import { GoModTidyResultSchema } from "../schemas/index.js";

export function registerModTidyTool(server: McpServer) {
  server.registerTool(
    "mod-tidy",
    {
      title: "Go Mod Tidy",
      description:
        "Runs go mod tidy to add missing and remove unused module dependencies. Use instead of running `go mod tidy` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
      },
      outputSchema: GoModTidyResultSchema,
    },
    async ({ path }) => {
      const cwd = path || process.cwd();
      const result = await goCmd(["mod", "tidy"], cwd);
      const data = parseGoModTidyOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatGoModTidy);
    },
  );
}
