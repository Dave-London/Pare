import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { tsc } from "../lib/build-runner.js";
import { parseTscOutput } from "../lib/parsers.js";
import { formatTsc } from "../lib/formatters.js";
import { TscResultSchema } from "../schemas/index.js";

export function registerTscTool(server: McpServer) {
  server.registerTool(
    "tsc",
    {
      title: "TypeScript Check",
      description:
        "Runs the TypeScript compiler and returns structured diagnostics (file, line, column, code, message)",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        noEmit: z
          .boolean()
          .optional()
          .default(true)
          .describe("Skip emitting output files (default: true)"),
        project: z.string().optional().describe("Path to tsconfig.json"),
      },
      outputSchema: TscResultSchema,
    },
    async ({ path, noEmit, project }) => {
      const cwd = path || process.cwd();
      const args: string[] = [];
      if (noEmit !== false) args.push("--noEmit");
      if (project) args.push("--project", project);

      const result = await tsc(args, cwd);
      const data = parseTscOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatTsc);
    },
  );
}
