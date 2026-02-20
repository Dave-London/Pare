import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parseBuildOutput } from "../lib/parsers.js";
import { formatBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { BunBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Bun Build",
      description:
        "Runs `bun build` to bundle JavaScript/TypeScript and returns structured output with artifact info.",
      inputSchema: {
        entrypoints: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Entry point files to bundle"),
        outdir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output directory (--outdir)"),
        outfile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output file path (--outfile)"),
        target: z
          .enum(["browser", "bun", "node"])
          .optional()
          .describe("Build target environment (--target)"),
        format: z
          .enum(["esm", "cjs", "iife"])
          .optional()
          .describe("Output module format (--format)"),
        minify: z.boolean().optional().describe("Minify the output (--minify)"),
        sourcemap: z
          .enum(["none", "inline", "external"])
          .optional()
          .describe("Source map generation (--sourcemap)"),
        splitting: z.boolean().optional().describe("Enable code splitting (--splitting)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunBuildResultSchema,
    },
    async ({
      entrypoints,
      outdir,
      outfile,
      target,
      format,
      minify,
      sourcemap,
      splitting,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();

      for (const entry of entrypoints) {
        assertNoFlagInjection(entry, "entrypoints");
      }
      if (outdir) assertNoFlagInjection(outdir, "outdir");
      if (outfile) assertNoFlagInjection(outfile, "outfile");

      const cmdArgs = ["build", ...entrypoints];
      if (outdir) cmdArgs.push("--outdir", outdir);
      if (outfile) cmdArgs.push("--outfile", outfile);
      if (target) cmdArgs.push("--target", target);
      if (format) cmdArgs.push("--format", format);
      if (minify) cmdArgs.push("--minify");
      if (sourcemap) cmdArgs.push("--sourcemap=" + sourcemap);
      if (splitting) cmdArgs.push("--splitting");

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await bunCmd(cmdArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseBuildOutput(
        entrypoints,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
