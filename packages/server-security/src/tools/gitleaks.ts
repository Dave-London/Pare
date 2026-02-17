import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, INPUT_LIMITS, assertAllowedRoot } from "@paretools/shared";
import { parseGitleaksJson } from "../lib/parsers.js";
import {
  formatGitleaksScan,
  compactGitleaksScanMap,
  formatGitleaksScanCompact,
} from "../lib/formatters.js";
import { GitleaksScanResultSchema } from "../schemas/index.js";

export function registerGitleaksTool(server: McpServer) {
  server.registerTool(
    "gitleaks",
    {
      title: "Gitleaks Secret Detection",
      description:
        "Runs Gitleaks to detect hardcoded secrets in git repositories. Returns structured finding data with redacted secrets.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path to scan"),
        noGit: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Scan files without git history (--no-git). Useful for scanning non-git directories.",
          ),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable verbose output from gitleaks"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: GitleaksScanResultSchema,
    },
    async ({ path, noGit, verbose, compact }) => {
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      const args: string[] = ["detect", "--report-format", "json", "--report-path", "/dev/stdout"];

      if (noGit) {
        args.push("--no-git");
      }

      if (verbose) {
        args.push("--verbose");
      }

      args.push("--source", cwd);

      // gitleaks exits with code 1 when findings are detected, which is not an error
      const result = await run("gitleaks", args, { cwd, timeout: 300_000 });

      const data = parseGitleaksJson(result.stdout);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatGitleaksScan,
        compactGitleaksScanMap,
        formatGitleaksScanCompact,
        compact === false,
      );
    },
  );
}
