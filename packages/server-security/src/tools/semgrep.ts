import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  INPUT_LIMITS,
  assertNoFlagInjection,
  assertAllowedRoot,
} from "@paretools/shared";
import { parseSemgrepJson } from "../lib/parsers.js";
import {
  formatSemgrepScan,
  compactSemgrepScanMap,
  formatSemgrepScanCompact,
} from "../lib/formatters.js";
import { SemgrepScanResultSchema } from "../schemas/index.js";

export function registerSemgrepTool(server: McpServer) {
  server.registerTool(
    "semgrep",
    {
      title: "Semgrep Static Analysis",
      description:
        "Runs Semgrep static analysis with structured rules and findings. Returns structured finding data with severity summary.",
      inputSchema: {
        patterns: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("File patterns or paths to scan (default: ['.'])"),
        config: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("auto")
          .describe(
            'Semgrep config/ruleset (e.g. "auto", "p/security-audit", "p/owasp-top-ten"). Default: "auto"',
          ),
        severity: z
          .enum(["INFO", "WARNING", "ERROR"])
          .optional()
          .describe("Severity filter. Default: all severities"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: SemgrepScanResultSchema,
    },
    async ({ patterns, config, severity, path, compact }) => {
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      // Validate inputs against flag injection
      if (config) assertNoFlagInjection(config, "config");
      for (const p of patterns) {
        assertNoFlagInjection(p, "patterns");
      }

      const args: string[] = ["scan", "--json", "--quiet"];

      if (config) {
        args.push("--config", config);
      }

      if (severity) {
        args.push("--severity", severity);
      }

      args.push(...patterns);

      const result = await run("semgrep", args, { cwd, timeout: 300_000 });

      const data = parseSemgrepJson(result.stdout, config);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatSemgrepScan,
        compactSemgrepScanMap,
        formatSemgrepScanCompact,
        compact === false,
      );
    },
  );
}
