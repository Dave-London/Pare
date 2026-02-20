import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  projectPathInput,
  compactInput,
} from "@paretools/shared";
import { rollupCmd } from "../lib/build-runner.js";
import { parseRollupOutput } from "../lib/parsers.js";
import { formatRollup, compactRollupMap, formatRollupCompact } from "../lib/formatters.js";
import { RollupResultSchema } from "../schemas/index.js";

/** Registers the `rollup` tool on the given MCP server. */
export function registerRollupTool(server: McpServer) {
  server.registerTool(
    "rollup",
    {
      title: "rollup",
      description:
        "Runs Rollup bundler and returns structured bundle output with errors and warnings.",
      inputSchema: {
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to rollup config file (maps to -c)"),
        input: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Entry point file (maps to --input)"),
        format: z
          .enum(["es", "cjs", "umd", "iife", "amd", "system"])
          .optional()
          .describe("Output format (maps to --format)"),
        output: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output file path (maps to --file)"),
        name: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Name for UMD/IIFE bundle (maps to --name)"),
        sourcemap: z.boolean().optional().describe("Generate source maps (maps to --sourcemap)"),
        watch: z.boolean().optional().describe("Run in watch mode (maps to --watch)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional rollup flags"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: RollupResultSchema,
    },
    async ({ config, input, format, output, name, sourcemap, watch, args, path, compact }) => {
      const cwd = path || process.cwd();
      if (config) assertNoFlagInjection(config, "config");
      if (input) assertNoFlagInjection(input, "input");
      if (output) assertNoFlagInjection(output, "output");
      if (name) assertNoFlagInjection(name, "name");

      const cliArgs: string[] = [];

      if (config) {
        cliArgs.push("-c", config);
      } else if (!input) {
        // Default to config-based build if no input is specified
        cliArgs.push("-c");
      }

      if (input) cliArgs.push("--input", input);
      if (format) cliArgs.push("--format", format);
      if (output) cliArgs.push("--file", output);
      if (name) cliArgs.push("--name", name);
      if (sourcemap) cliArgs.push("--sourcemap");
      if (watch) cliArgs.push("--watch");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await rollupCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseRollupOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        rawOutput,
        formatRollup,
        compactRollupMap,
        formatRollupCompact,
        compact === false,
      );
    },
  );
}
