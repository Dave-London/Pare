import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { viteCmd } from "../lib/build-runner.js";
import { parseViteBuildOutput } from "../lib/parsers.js";
import { formatViteBuild, compactViteBuildMap, formatViteBuildCompact } from "../lib/formatters.js";
import { ViteBuildResultSchema } from "../schemas/index.js";

/** Registers the `vite-build` tool on the given MCP server. */
export function registerViteBuildTool(server: McpServer) {
  server.registerTool(
    "vite-build",
    {
      title: "Vite Build",
      description:
        "Runs Vite production build and returns structured output files with sizes. Use instead of running `vite build` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        mode: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("production")
          .describe("Build mode (default: production)"),
        manifest: z
          .boolean()
          .optional()
          .describe("Generate a manifest.json for backend-integrated builds (maps to --manifest)"),
        minify: z
          .enum(["esbuild", "terser", "false"])
          .optional()
          .describe("Minification strategy (esbuild, terser, or false to disable)"),
        logLevel: z
          .enum(["info", "warn", "error", "silent"])
          .optional()
          .describe("Log level to control output verbosity"),
        emptyOutDir: z
          .boolean()
          .optional()
          .describe("Empty the output directory before building (maps to --emptyOutDir)"),
        reportCompressedSize: z
          .boolean()
          .optional()
          .describe(
            "Report compressed (gzip) size of output files — disable to speed up large builds",
          ),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional Vite build flags"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: ViteBuildResultSchema,
    },
    async ({
      path,
      mode,
      manifest,
      minify,
      logLevel,
      emptyOutDir,
      reportCompressedSize,
      args,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (mode) assertNoFlagInjection(mode, "mode");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cliArgs: string[] = [];

      if (mode && mode !== "production") {
        cliArgs.push("--mode", mode);
      }
      if (manifest) cliArgs.push("--manifest");
      if (minify) cliArgs.push(`--minify=${minify}`);
      if (logLevel) cliArgs.push(`--logLevel=${logLevel}`);
      if (emptyOutDir !== undefined) {
        cliArgs.push(emptyOutDir ? "--emptyOutDir" : "--no-emptyOutDir");
      }
      if (reportCompressedSize === false) cliArgs.push("--no-reportCompressedSize");

      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await viteCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseViteBuildOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        rawOutput,
        formatViteBuild,
        compactViteBuildMap,
        formatViteBuildCompact,
        compact === false,
      );
    },
  );
}
