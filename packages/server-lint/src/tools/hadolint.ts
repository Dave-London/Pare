import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { hadolintCmd } from "../lib/lint-runner.js";
import { parseHadolintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

/** Registers the `hadolint` tool on the given MCP server. */
export function registerHadolintTool(server: McpServer) {
  server.registerTool(
    "hadolint",
    {
      title: "Hadolint",
      description:
        "Runs Hadolint (Dockerfile linter) and returns structured diagnostics (file, line, rule, severity, message). Use instead of running `hadolint` in the terminal.",
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
          .default(["Dockerfile"])
          .describe("Dockerfile paths to check (default: ['Dockerfile'])"),
        trustedRegistries: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Trusted Docker registries (e.g., ['docker.io', 'ghcr.io'])"),
        ignoreRules: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes to ignore (e.g., ['DL3008', 'DL3013'])"),
        failureThreshold: z
          .enum(["error", "warning", "info", "style", "ignore", "none"])
          .optional()
          .describe("Minimum severity to cause a non-zero exit code (maps to --failure-threshold)"),
        noFail: z
          .boolean()
          .optional()
          .describe("Always exit with 0 for informational-only runs (maps to --no-fail)"),
        strictLabels: z
          .boolean()
          .optional()
          .describe("Enforce strict label schema (maps to --strict-labels)"),
        verbose: z.boolean().optional().describe("Enable verbose output (maps to --verbose)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: LintResultSchema,
    },
    async ({
      path,
      patterns,
      trustedRegistries,
      ignoreRules,
      failureThreshold,
      noFail,
      strictLabels,
      verbose,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of patterns ?? []) {
        assertNoFlagInjection(p, "patterns");
      }
      const args = ["--format=json"];

      if (trustedRegistries) {
        for (const reg of trustedRegistries) {
          assertNoFlagInjection(reg, "trustedRegistries");
          args.push(`--trusted-registry=${reg}`);
        }
      }

      if (ignoreRules) {
        for (const rule of ignoreRules) {
          assertNoFlagInjection(rule, "ignoreRules");
          args.push(`--ignore=${rule}`);
        }
      }

      if (failureThreshold) args.push(`--failure-threshold=${failureThreshold}`);
      if (noFail) args.push("--no-fail");
      if (strictLabels) args.push("--strict-labels");
      if (verbose) args.push("--verbose");

      args.push(...(patterns || ["Dockerfile"]));

      const result = await hadolintCmd(args, cwd);
      const data = parseHadolintJson(result.stdout);
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
