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
        "Runs Hadolint (Dockerfile linter) and returns structured diagnostics (file, line, rule, severity, message).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
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
        config: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Hadolint configuration file (maps to --config)"),
        requireLabel: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Required labels in Dockerfiles, e.g. ['maintainer:text'] (maps to --require-label)",
          ),
        shell: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Default shell for RUN instruction linting, e.g. '/bin/bash' (maps to --shell)",
          ),
        errorRules: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes to treat as errors (maps to --error)"),
        warningRules: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes to treat as warnings (maps to --warning)"),
        infoRules: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Rule codes to treat as info (maps to --info)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
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
      config,
      requireLabel,
      shell,
      errorRules,
      warningRules,
      infoRules,
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

      if (config) {
        assertNoFlagInjection(config, "config");
        args.push(`--config=${config}`);
      }

      if (requireLabel) {
        for (const label of requireLabel) {
          assertNoFlagInjection(label, "requireLabel");
          args.push(`--require-label=${label}`);
        }
      }

      if (shell) {
        assertNoFlagInjection(shell, "shell");
        args.push(`--shell=${shell}`);
      }

      if (errorRules) {
        for (const rule of errorRules) {
          assertNoFlagInjection(rule, "errorRules");
          args.push(`--error=${rule}`);
        }
      }

      if (warningRules) {
        for (const rule of warningRules) {
          assertNoFlagInjection(rule, "warningRules");
          args.push(`--warning=${rule}`);
        }
      }

      if (infoRules) {
        for (const rule of infoRules) {
          assertNoFlagInjection(rule, "infoRules");
          args.push(`--info=${rule}`);
        }
      }

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
