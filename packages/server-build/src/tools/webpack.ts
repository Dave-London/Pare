import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { webpackCmd } from "../lib/build-runner.js";
import { parseWebpackOutput } from "../lib/parsers.js";
import { formatWebpack, compactWebpackMap, formatWebpackCompact } from "../lib/formatters.js";
import { WebpackResultSchema } from "../schemas/index.js";

export function registerWebpackTool(server: McpServer) {
  server.registerTool(
    "webpack",
    {
      title: "webpack",
      description:
        "Runs webpack build with JSON stats output and returns structured assets, errors, and warnings.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to webpack config file"),
        mode: z
          .enum(["production", "development", "none"])
          .optional()
          .describe("Build mode (production, development, none)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional webpack flags"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: WebpackResultSchema,
    },
    async ({ path, config, mode, args, compact }) => {
      const cwd = path || process.cwd();
      if (config) assertNoFlagInjection(config, "config");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

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
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseWebpackOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        rawOutput,
        formatWebpack,
        compactWebpackMap,
        formatWebpackCompact,
        compact === false,
      );
    },
  );
}
