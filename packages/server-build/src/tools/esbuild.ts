import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { esbuildCmd } from "../lib/build-runner.js";
import { parseEsbuildOutput } from "../lib/parsers.js";
import { formatEsbuild, compactEsbuildMap, formatEsbuildCompact } from "../lib/formatters.js";
import { EsbuildResultSchema } from "../schemas/index.js";

export function registerEsbuildTool(server: McpServer) {
  server.registerTool(
    "esbuild",
    {
      title: "esbuild",
      description:
        "Runs the esbuild bundler and returns structured errors, warnings, and output files.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
        entryPoints: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Entry point files to bundle (e.g., ['src/index.ts'])"),
        outdir: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Output directory"),
        outfile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output file (single entry point)"),
        bundle: z
          .boolean()
          .optional()
          .default(true)
          .describe("Bundle dependencies (default: true)"),
        minify: z.boolean().optional().default(false).describe("Minify output (default: false)"),
        format: z
          .enum(["esm", "cjs", "iife"])
          .optional()
          .describe("Output format (esm, cjs, iife)"),
        platform: z
          .enum(["browser", "node", "neutral"])
          .optional()
          .describe("Target platform (browser, node, neutral)"),
        sourcemap: z
          .boolean()
          .optional()
          .default(false)
          .describe("Generate source maps (default: false)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional esbuild flags"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: EsbuildResultSchema,
    },
    async ({
      path,
      entryPoints,
      outdir,
      outfile,
      bundle,
      minify,
      format,
      platform,
      sourcemap,
      args,
      compact,
    }) => {
      const cwd = path || process.cwd();

      // Validate entry points to prevent flag injection
      for (const ep of entryPoints) {
        assertNoFlagInjection(ep, "entryPoints");
      }

      const cliArgs: string[] = [...entryPoints];

      if (bundle !== false) cliArgs.push("--bundle");
      if (outdir) cliArgs.push(`--outdir=${outdir}`);
      if (outfile) cliArgs.push(`--outfile=${outfile}`);
      if (minify) cliArgs.push("--minify");
      if (format) cliArgs.push(`--format=${format}`);
      if (platform) cliArgs.push(`--platform=${platform}`);
      if (sourcemap) cliArgs.push("--sourcemap");

      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (args) {
        cliArgs.push(...args);
      }

      const start = Date.now();
      const result = await esbuildCmd(cliArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;
      const rawOutput = result.stdout + "\n" + result.stderr;

      const data = parseEsbuildOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        rawOutput,
        formatEsbuild,
        compactEsbuildMap,
        formatEsbuildCompact,
        compact === false,
      );
    },
  );
}
