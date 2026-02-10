import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { runBuildCommand } from "../lib/build-runner.js";
import { parseBuildCommandOutput } from "../lib/parsers.js";
import { formatBuildCommand } from "../lib/formatters.js";
import { BuildResultSchema } from "../schemas/index.js";

export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Run Build",
      description:
        "Runs a build command and returns structured success/failure with errors and warnings",
      inputSchema: {
        command: z.string().describe("Build command to run (e.g., 'npm', 'npx', 'pnpm')"),
        args: z
          .array(z.string())
          .default([])
          .describe("Arguments for the build command (e.g., ['run', 'build'])"),
        path: z.string().optional().describe("Working directory (default: cwd)"),
      },
      outputSchema: BuildResultSchema,
    },
    async ({ command, args, path }) => {
      const cwd = path || process.cwd();
      const start = Date.now();
      const result = await runBuildCommand(command, args || [], cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseBuildCommandOutput(result.stdout, result.stderr, result.exitCode, duration);
      return dualOutput(data, formatBuildCommand);
    },
  );
}
