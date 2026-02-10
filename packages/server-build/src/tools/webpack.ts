import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { webpackCmd } from "../lib/build-runner.js";
import { parseWebpackOutput } from "../lib/parsers.js";
import { formatWebpack } from "../lib/formatters.js";
import { WebpackResultSchema } from "../schemas/index.js";

export function registerWebpackTool(server: McpServer) {
  server.registerTool(
    "webpack",
    {
      title: "webpack",
      description:
        "Runs webpack build with JSON stats output and returns structured assets, errors, and warnings. Use instead of running `webpack` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        config: z.string().optional().describe("Path to webpack config file"),
        mode: z
          .enum(["production", "development", "none"])
          .optional()
          .describe("Build mode (production, development, none)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional webpack flags"),
      },
      outputSchema: WebpackResultSchema,
    },
    async ({ path, config, mode, args }) => {
      const cwd = path || process.cwd();
      const cliArgs: string[] = [];

      if (config) cliArgs.push("--config", config);
      if (mode) cliArgs.push("--mode", mode);
      cliArgs.push("--json");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await webpackCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseWebpackOutput(result.stdout, result.stderr, result.exitCode, duration);
      return dualOutput(data, formatWebpack);
    },
  );
}
