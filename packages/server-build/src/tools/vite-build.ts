import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { viteCmd } from "../lib/build-runner.js";
import { parseViteBuildOutput } from "../lib/parsers.js";
import { formatViteBuild } from "../lib/formatters.js";
import { ViteBuildResultSchema } from "../schemas/index.js";

export function registerViteBuildTool(server: McpServer) {
  server.registerTool(
    "vite-build",
    {
      title: "Vite Build",
      description:
        "Runs Vite production build and returns structured output files with sizes. Use instead of running `vite build` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        mode: z
          .string()
          .optional()
          .default("production")
          .describe("Build mode (default: production)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional Vite build flags"),
      },
      outputSchema: ViteBuildResultSchema,
    },
    async ({ path, mode, args }) => {
      const cwd = path || process.cwd();
      const cliArgs: string[] = [];

      if (mode && mode !== "production") {
        cliArgs.push("--mode", mode);
      }

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await viteCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseViteBuildOutput(result.stdout, result.stderr, result.exitCode, duration);
      return dualOutput(data, formatViteBuild);
    },
  );
}
