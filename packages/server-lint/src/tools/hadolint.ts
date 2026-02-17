import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { hadolintCmd } from "../lib/lint-runner.js";
import { parseHadolintJson } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { LintResultSchema } from "../schemas/index.js";

export function registerHadolintTool(server: McpServer) {
  server.registerTool(
    "hadolint",
    {
      title: "Hadolint",
      description:
        "Runs Hadolint (Dockerfile linter) and returns structured diagnostics (file, line, rule, severity, message).",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: LintResultSchema,
    },
    async ({ path, patterns, trustedRegistries, ignoreRules, compact }) => {
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
