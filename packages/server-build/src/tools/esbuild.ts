import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { esbuildCmd } from "../lib/build-runner.js";
import { parseEsbuildOutput } from "../lib/parsers.js";
import { formatEsbuild, compactEsbuildMap, formatEsbuildCompact } from "../lib/formatters.js";
import { EsbuildResultSchema } from "../schemas/index.js";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";

/** Registers the `esbuild` tool on the given MCP server. */
export function registerEsbuildTool(server: McpServer) {
  server.registerTool(
    "esbuild",
    {
      title: "esbuild",
      description:
        "Runs the esbuild bundler and returns structured errors, warnings, and output files. Use instead of running `esbuild` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
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
          .enum(["true", "linked", "inline", "external", "both"])
          .optional()
          .describe(
            "Source map mode: 'true' for default, 'linked', 'inline', 'external', or 'both'",
          ),
        target: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Target environment (e.g., 'es2020', 'node16', 'chrome90'). Maps to --target."),
        external: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Packages to exclude from the bundle (e.g., ['react', 'react-dom']). Maps to --external.",
          ),
        tsconfig: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to tsconfig.json for TypeScript configuration (maps to --tsconfig)"),
        drop: z
          .array(z.enum(["console", "debugger"]))
          .max(2)
          .optional()
          .describe("Statements to drop from output (maps to --drop:console, --drop:debugger)"),
        splitting: z
          .boolean()
          .optional()
          .describe("Enable code splitting (requires format=esm and outdir)"),
        legalComments: z
          .enum(["none", "inline", "eof", "linked", "external"])
          .optional()
          .describe("How to handle legal comments (license headers)"),
        logLevel: z
          .enum(["verbose", "debug", "info", "warning", "error", "silent"])
          .optional()
          .describe("Log level to control output verbosity"),
        define: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "Compile-time constant replacements (e.g., { 'process.env.NODE_ENV': '\"production\"' }). " +
              "Maps to --define:KEY=VALUE for each entry.",
          ),
        metafile: z
          .boolean()
          .optional()
          .describe(
            "Generate a metafile with bundle analysis data (inputs/outputs with byte sizes). " +
              "When enabled, the metafile is included in the structured output.",
          ),
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
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
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
      target,
      external,
      tsconfig,
      drop,
      splitting,
      legalComments,
      logLevel,
      define,
      metafile,
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
      if (sourcemap) {
        if (sourcemap === "true") {
          cliArgs.push("--sourcemap");
        } else {
          cliArgs.push(`--sourcemap=${sourcemap}`);
        }
      }
      if (target) {
        assertNoFlagInjection(target, "target");
        cliArgs.push(`--target=${target}`);
      }
      if (external) {
        for (const ext of external) {
          assertNoFlagInjection(ext, "external");
          cliArgs.push(`--external:${ext}`);
        }
      }
      if (tsconfig) {
        assertNoFlagInjection(tsconfig, "tsconfig");
        cliArgs.push(`--tsconfig=${tsconfig}`);
      }
      if (drop) {
        for (const d of drop) {
          cliArgs.push(`--drop:${d}`);
        }
      }
      if (splitting) cliArgs.push("--splitting");
      if (legalComments) cliArgs.push(`--legal-comments=${legalComments}`);
      if (logLevel) cliArgs.push(`--log-level=${logLevel}`);

      // Gap #79: define parameter — compile-time constant replacements
      const defineRecord = define as Record<string, string> | undefined;
      if (defineRecord) {
        for (const [key, value] of Object.entries(defineRecord)) {
          assertNoFlagInjection(String(key), "define key");
          assertNoFlagInjection(String(value), "define value");
          cliArgs.push(`--define:${key}=${value}`);
        }
      }

      // Gap #80: metafile parameter — bundle analysis data
      let metafilePath: string | undefined;
      if (metafile) {
        const suffix = randomBytes(6).toString("hex");
        metafilePath = join(tmpdir(), `pare-esbuild-meta-${suffix}.json`);
        cliArgs.push(`--metafile=${metafilePath}`);
      }

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

      // Read metafile if it was generated
      let metafileContent: string | undefined;
      if (metafilePath) {
        try {
          metafileContent = await readFile(metafilePath, "utf-8");
        } catch {
          // Metafile may not exist if build failed
        }
        // Clean up the temp metafile
        try {
          await unlink(metafilePath);
        } catch {
          // Ignore cleanup errors
        }
      }

      const data = parseEsbuildOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        metafilePath,
        metafileContent,
      );
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
