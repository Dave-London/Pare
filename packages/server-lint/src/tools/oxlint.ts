import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  configInput,
} from "@paretools/shared";
import { oxlintCmd } from "../lib/lint-runner.js";
import { parseOxlintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `oxlint` tool on the given MCP server. */
export function registerOxlintTool(server: McpServer) {
  server.registerTool(
    "oxlint",
    {
      title: "Oxlint Check",
      description:
        "Runs Oxlint and returns structured diagnostics (file, line, column, rule, severity, message).",
      inputSchema: {
        path: projectPathInput,
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns to lint (default: ['.'])"),
        fix: z.boolean().optional().describe("Auto-fix problems (maps to --fix)"),
        quiet: z
          .boolean()
          .optional()
          .describe("Report errors only, suppress warnings (maps to --quiet)"),
        fixSuggestions: z
          .boolean()
          .optional()
          .describe("Apply suggestion-level fixes (maps to --fix-suggestions)"),
        threads: z.number().optional().describe("Number of threads to use for parallel linting"),
        noIgnore: z.boolean().optional().describe("Disable ignore patterns (maps to --no-ignore)"),
        config: configInput("Path to Oxlint configuration file (maps to --config)"),
        deny: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rules to deny (error level) (maps to -D)"),
        warn: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rules to warn on (maps to -W)"),
        allow: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rules to allow (disable) (maps to -A)"),
        plugins: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Plugin categories to enable (e.g., 'import', 'jest', 'jsx-a11y') (maps to --<plugin>-plugin)",
          ),
        tsconfig: configInput("Path to tsconfig.json for type-aware rules (maps to --tsconfig)"),
        ignorePath: configInput("Path to an alternate ignore file (maps to --ignore-path)"),
        compact: compactInput,
      },
      outputSchema: LintResultSchema,
    },
    async ({
      path,
      patterns,
      fix,
      quiet,
      fixSuggestions,
      threads,
      noIgnore,
      config,
      deny,
      warn,
      allow,
      plugins,
      tsconfig,
      ignorePath,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format", "json", ...(patterns || ["."])];
      if (fix) args.push("--fix");
      if (quiet) args.push("--quiet");
      if (fixSuggestions) args.push("--fix-suggestions");
      if (threads !== undefined) args.push(`--threads=${threads}`);
      if (noIgnore) args.push("--no-ignore");
      if (config) {
        assertNoFlagInjection(config, "config");
        args.push(`--config=${config}`);
      }
      if (deny) {
        for (const rule of deny) {
          assertNoFlagInjection(rule, "deny");
          args.push("-D", rule);
        }
      }
      if (warn) {
        for (const rule of warn) {
          assertNoFlagInjection(rule, "warn");
          args.push("-W", rule);
        }
      }
      if (allow) {
        for (const rule of allow) {
          assertNoFlagInjection(rule, "allow");
          args.push("-A", rule);
        }
      }
      if (plugins) {
        for (const plugin of plugins) {
          assertNoFlagInjection(plugin, "plugins");
          args.push(`--${plugin}-plugin`);
        }
      }
      if (tsconfig) {
        assertNoFlagInjection(tsconfig, "tsconfig");
        args.push(`--tsconfig=${tsconfig}`);
      }
      if (ignorePath) {
        assertNoFlagInjection(ignorePath, "ignorePath");
        args.push(`--ignore-path=${ignorePath}`);
      }

      const result = await oxlintCmd(args, cwd);
      const data = parseOxlintJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatLint,
        compactLintMap,
        formatLintCompact,
        compact === false,
      );
    },
  );
}
