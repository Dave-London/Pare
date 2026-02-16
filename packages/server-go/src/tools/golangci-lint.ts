import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { golangciLintCmd } from "../lib/go-runner.js";
import { parseGolangciLintJson } from "../lib/parsers.js";
import {
  formatGolangciLint,
  compactGolangciLintMap,
  formatGolangciLintCompact,
} from "../lib/formatters.js";
import { GolangciLintResultSchema } from "../schemas/index.js";

/** Registers the `golangci-lint` tool on the given MCP server. */
export function registerGolangciLintTool(server: McpServer) {
  server.registerTool(
    "golangci-lint",
    {
      title: "golangci-lint",
      description:
        "Runs golangci-lint and returns structured lint diagnostics (file, line, linter, severity, message). Use instead of running `golangci-lint` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("File patterns or packages to lint (default: ['./...'])"),
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to golangci-lint config file"),
        fix: z
          .boolean()
          .optional()
          .default(false)
          .describe("Automatically fix found issues where possible (--fix)"),
        fast: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run only fast linters for quick feedback during iteration (--fast)"),
        new: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show only new issues (--new). Useful for incremental linting."),
        sortResults: z
          .boolean()
          .optional()
          .default(false)
          .describe("Sort lint results for consistent output (--sort-results)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GolangciLintResultSchema,
    },
    async ({ path, patterns, config, fix, fast, new: newOnly, sortResults, compact }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      if (config) {
        assertNoFlagInjection(config, "config");
      }

      const args = ["run", "--out-format", "json"];
      if (config) {
        args.push("--config", config);
      }
      if (fix) args.push("--fix");
      if (fast) args.push("--fast");
      if (newOnly) args.push("--new");
      if (sortResults) args.push("--sort-results");
      args.push(...(patterns || ["./..."]));

      const result = await golangciLintCmd(args, cwd);
      // golangci-lint outputs JSON to stdout even on exit code 1 (issues found)
      const data = parseGolangciLintJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatGolangciLint,
        compactGolangciLintMap,
        formatGolangciLintCompact,
        compact === false,
      );
    },
  );
}
