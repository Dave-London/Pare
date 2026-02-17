import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { prettier } from "../lib/lint-runner.js";
import {
  parsePrettierListDifferent,
  parsePrettierWrite,
  buildPrettierWriteResult,
} from "../lib/parsers.js";
import {
  formatFormatWrite,
  compactFormatWriteMap,
  formatFormatWriteCompact,
} from "../lib/formatters.js";
import { FormatWriteResultSchema } from "../schemas/index.js";

/** Registers the `prettier-format` tool on the given MCP server. */
export function registerPrettierFormatTool(server: McpServer) {
  server.registerTool(
    "prettier-format",
    {
      title: "Prettier Format",
      description:
        "Formats files with Prettier (--write) and returns a structured list of changed files.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns to format (default: ['.'])"),
        ignoreUnknown: z
          .boolean()
          .optional()
          .describe("Ignore files that cannot be parsed (maps to --ignore-unknown)"),
        cache: z
          .boolean()
          .optional()
          .describe("Cache formatted files for faster subsequent runs (maps to --cache)"),
        noConfig: z
          .boolean()
          .optional()
          .describe("Do not look for a configuration file (maps to --no-config)"),
        logLevel: z
          .enum(["silent", "error", "warn", "log", "debug"])
          .optional()
          .describe("Log level to control output verbosity"),
        endOfLine: z
          .enum(["lf", "crlf", "cr", "auto"])
          .optional()
          .describe("Line ending style override"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a Prettier configuration file (maps to --config)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: FormatWriteResultSchema,
    },
    async ({
      path,
      patterns,
      ignoreUnknown,
      cache,
      noConfig,
      logLevel,
      endOfLine,
      config,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }

      // Build shared args (excluding --write and --list-different)
      const sharedArgs: string[] = [];
      if (ignoreUnknown) sharedArgs.push("--ignore-unknown");
      if (cache) sharedArgs.push("--cache");
      if (noConfig) sharedArgs.push("--no-config");
      if (logLevel) sharedArgs.push(`--log-level=${logLevel}`);
      if (endOfLine) sharedArgs.push(`--end-of-line=${endOfLine}`);
      if (config) {
        assertNoFlagInjection(config, "config");
        sharedArgs.push(`--config=${config}`);
      }
      const filePatterns = patterns || ["."];

      // Step 1: Run --list-different to find files that need formatting
      let listDiffFiles: string[] = [];
      try {
        const listDiffResult = await prettier(
          ["--list-different", ...sharedArgs, ...filePatterns],
          cwd,
        );
        listDiffFiles = parsePrettierListDifferent(listDiffResult.stdout);
      } catch {
        // --list-different may fail if prettier is not installed or patterns are invalid.
        // Fall back to --write only mode below.
      }

      // Step 2: Run --write to actually format the files
      const writeArgs = ["--write", ...sharedArgs, ...filePatterns];
      const writeResult = await prettier(writeArgs, cwd);

      // Step 3: Build accurate result
      let data;
      if (listDiffFiles.length > 0 || writeResult.exitCode === 0) {
        // Count total files processed from --write output for filesUnchanged calculation
        const writeData = parsePrettierWrite(writeResult.stdout, writeResult.stderr, 0);
        const totalProcessed = writeData.files?.length ?? 0;
        data = buildPrettierWriteResult(listDiffFiles, writeResult.exitCode, totalProcessed);
      } else {
        // Fall back to simple --write parsing if --list-different produced no results
        data = parsePrettierWrite(writeResult.stdout, writeResult.stderr, writeResult.exitCode);
      }

      return compactDualOutput(
        data,
        writeResult.stdout,
        formatFormatWrite,
        compactFormatWriteMap,
        formatFormatWriteCompact,
        compact === false,
      );
    },
  );
}
