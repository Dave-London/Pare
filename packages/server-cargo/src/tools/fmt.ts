import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoFmtOutput } from "../lib/parsers.js";
import { formatCargoFmt, compactFmtMap, formatFmtCompact } from "../lib/formatters.js";
import { CargoFmtResultSchema } from "../schemas/index.js";

/** Registers the `fmt` tool on the given MCP server. */
export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Cargo Fmt",
      description: "Checks or fixes Rust formatting and returns structured output.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check only without modifying files (--check)"),
        all: z
          .boolean()
          .optional()
          .default(false)
          .describe("Format all packages in the workspace (--all)"),
        backup: z
          .boolean()
          .optional()
          .default(false)
          .describe("Create backup files before formatting (--backup)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to format in a workspace (-p <NAME>)"),
        edition: z
          .enum(["2015", "2018", "2021", "2024"])
          .optional()
          .describe("Rust edition for formatting rules (-- --edition <EDITION>)"),
        config: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Rustfmt configuration options (-- --config <KEY=VALUE>)"),
        configPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to rustfmt config file (-- --config-path <PATH>)"),
        emit: z
          .enum(["files", "stdout"])
          .optional()
          .describe("Output mode for rustfmt (-- --emit <MODE>)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: CargoFmtResultSchema,
    },
    async ({
      path,
      check,
      all,
      backup,
      package: pkg,
      edition,
      config,
      configPath,
      emit,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (configPath) assertNoFlagInjection(configPath, "configPath");

      const args = ["fmt"];
      if (pkg) args.push("-p", pkg);
      if (check) args.push("--check");
      if (all) args.push("--all");

      // Rustfmt args go after --
      const rustfmtArgs: string[] = [];
      if (backup) rustfmtArgs.push("--backup");
      if (edition) rustfmtArgs.push("--edition", edition);
      if (config) rustfmtArgs.push("--config", config);
      if (configPath) rustfmtArgs.push("--config-path", configPath);
      if (emit) rustfmtArgs.push("--emit", emit);
      // Gap #92: In check mode, use --files-with-diff for more reliable file detection
      // In non-check mode, pass -l (--files-with-diff) to get list of reformatted files
      if (check) {
        rustfmtArgs.push("--files-with-diff");
      } else {
        rustfmtArgs.push("-l");
      }
      if (rustfmtArgs.length > 0) {
        args.push("--", ...rustfmtArgs);
      }

      const result = await cargo(args, cwd);
      const data = parseCargoFmtOutput(result.stdout, result.stderr, result.exitCode, !!check);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoFmt,
        compactFmtMap,
        formatFmtCompact,
        compact === false,
      );
    },
  );
}
