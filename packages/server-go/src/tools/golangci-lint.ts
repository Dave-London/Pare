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

export function registerGolangciLintTool(server: McpServer) {
  server.registerTool(
    "golangci-lint",
    {
      title: "golangci-lint",
      description:
        "Runs golangci-lint and returns structured lint diagnostics (file, line, linter, severity, message).",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: GolangciLintResultSchema,
    },
    async ({ path, patterns, config, compact }) => {
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
