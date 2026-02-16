import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoModTidyOutput } from "../lib/parsers.js";
import { formatGoModTidy, compactModTidyMap, formatModTidyCompact } from "../lib/formatters.js";
import { GoModTidyResultSchema } from "../schemas/index.js";

/** Registers the `mod-tidy` tool on the given MCP server. */
export function registerModTidyTool(server: McpServer) {
  server.registerTool(
    "mod-tidy",
    {
      title: "Go Mod Tidy",
      description:
        "Runs go mod tidy to add missing and remove unused module dependencies. Use instead of running `go mod tidy` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Non-destructive check mode: show what changes would be made without modifying files (-diff)",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print information about removed modules (-v)"),
        continueOnError: z
          .boolean()
          .optional()
          .default(false)
          .describe("Attempt to proceed despite errors encountered while loading packages (-e)"),
        goVersion: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set the expected Go language version (-go=<version>). Example: '1.21'"),
        compat: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Preserve backward compatibility with the specified Go version (-compat=<version>). Example: '1.20'",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoModTidyResultSchema,
    },
    async ({ path, diff, verbose, continueOnError, goVersion, compat, compact }) => {
      const cwd = path || process.cwd();
      if (goVersion) assertNoFlagInjection(goVersion, "goVersion");
      if (compat) assertNoFlagInjection(compat, "compat");
      const args = ["mod", "tidy"];
      if (diff) args.push("-diff");
      if (verbose) args.push("-v");
      if (continueOnError) args.push("-e");
      if (goVersion) args.push(`-go=${goVersion}`);
      if (compat) args.push(`-compat=${compat}`);
      const result = await goCmd(args, cwd);
      const data = parseGoModTidyOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoModTidy,
        compactModTidyMap,
        formatModTidyCompact,
        compact === false,
      );
    },
  );
}
