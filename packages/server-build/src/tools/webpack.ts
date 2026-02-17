import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { webpackCmd } from "../lib/build-runner.js";
import { parseWebpackOutput } from "../lib/parsers.js";
import { formatWebpack, compactWebpackMap, formatWebpackCompact } from "../lib/formatters.js";
import { WebpackResultSchema } from "../schemas/index.js";

/** Registers the `webpack` tool on the given MCP server. */
export function registerWebpackTool(server: McpServer) {
  server.registerTool(
    "webpack",
    {
      title: "webpack",
      description:
        "Runs webpack build with JSON stats output and returns structured assets, errors, and warnings.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to webpack config file"),
        mode: z
          .enum(["production", "development", "none"])
          .optional()
          .describe("Build mode (production, development, none)"),
        entry: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Entry point file to build (maps to --entry)"),
        target: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Build target environment (e.g., 'web', 'node', 'electron-main'). Maps to --target.",
          ),
        devtool: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Source map strategy (e.g., 'source-map', 'eval', 'cheap-module-source-map'). Maps to --devtool.",
          ),
        analyze: z
          .boolean()
          .optional()
          .describe("Enable webpack-bundle-analyzer for bundle size analysis (maps to --analyze)"),
        bail: z
          .boolean()
          .optional()
          .describe("Fail on the first error instead of tolerating them (maps to --bail)"),
        cache: z
          .boolean()
          .optional()
          .describe("Enable or disable webpack caching (maps to --cache / --no-cache)"),
        env: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "Environment variables passed to the webpack config function via --env key=value " +
              "(e.g., { production: 'true', apiUrl: 'https://api.example.com' }).",
          ),
        profile: z
          .boolean()
          .optional()
          .describe(
            "Enable webpack profiling to capture per-module timing data (maps to --profile). " +
              "When enabled, profile data is included in the structured output.",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional webpack flags"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: WebpackResultSchema,
    },
    async ({
      path,
      config,
      mode,
      entry,
      target,
      devtool,
      analyze,
      bail,
      cache,
      env,
      profile,
      args,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (config) assertNoFlagInjection(config, "config");
      if (entry) assertNoFlagInjection(entry, "entry");
      if (target) assertNoFlagInjection(target, "target");
      if (devtool) assertNoFlagInjection(devtool, "devtool");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      // Validate env keys and values (Gap #84)
      const envRecord = env as Record<string, string> | undefined;
      if (envRecord) {
        for (const [key, value] of Object.entries(envRecord)) {
          assertNoFlagInjection(String(key), "env key");
          assertNoFlagInjection(String(value), "env value");
        }
      }

      const cliArgs: string[] = [];

      if (config) cliArgs.push("--config", config);
      if (mode) cliArgs.push("--mode", mode);
      if (entry) cliArgs.push("--entry", entry);
      if (target) cliArgs.push("--target", target);
      if (devtool) cliArgs.push("--devtool", devtool);
      if (analyze) cliArgs.push("--analyze");
      if (bail) cliArgs.push("--bail");
      if (cache !== undefined) {
        cliArgs.push(cache ? "--cache" : "--no-cache");
      }
      // Gap #84: env parameter — pass key=value pairs to webpack config function
      if (envRecord) {
        for (const [key, value] of Object.entries(envRecord)) {
          cliArgs.push("--env", `${key}=${value}`);
        }
      }
      // Gap #85: profile parameter — enable per-module timing data
      if (profile) cliArgs.push("--profile");
      cliArgs.push("--json");
      cliArgs.push("--no-color");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await webpackCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseWebpackOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        profile,
      );
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
