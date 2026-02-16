import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  run,
  INPUT_LIMITS,
  assertAllowedRoot,
  assertNoFlagInjection,
} from "@paretools/shared";
import { parseTrivyJson } from "../lib/parsers.js";
import { formatTrivyScan, compactTrivyScanMap, formatTrivyScanCompact } from "../lib/formatters.js";
import { TrivyScanResultSchema } from "../schemas/index.js";

/** Registers the `trivy` tool on the given MCP server. */
export function registerTrivyTool(server: McpServer) {
  server.registerTool(
    "trivy",
    {
      title: "Trivy Security Scanner",
      description:
        "Runs Trivy vulnerability/misconfiguration scanner on container images, filesystems, or IaC configs. Returns structured vulnerability data with severity summary. Use instead of running `trivy` in the terminal.",
      inputSchema: {
        target: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .describe("Scan target: image name (e.g. 'alpine:3.18') or filesystem path"),
        scanType: z
          .enum(["image", "fs", "config"])
          .optional()
          .default("image")
          .describe(
            'Scan type: "image" for container images, "fs" for filesystem, "config" for IaC misconfigurations',
          ),
        severity: z
          .union([
            z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
            z
              .array(z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]))
              .max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            'Severity filter. Single value or array for CSV (e.g., ["CRITICAL", "HIGH"]). Default: all severities',
          ),
        scanners: z
          .array(z.enum(["vuln", "misconfig", "secret", "license"]))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            'Scanner types to enable (--scanners, e.g., ["vuln", "misconfig"]). Default: all',
          ),
        vulnType: z
          .array(z.enum(["os", "library"]))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            'Vulnerability types to scan (--vuln-type, e.g., ["os", "library"]). Default: all',
          ),
        skipDirs: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Directories to skip during scanning (--skip-dirs)"),
        skipFiles: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Files to skip during scanning (--skip-files)"),
        platform: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Platform for multi-arch image scanning (--platform, e.g., "linux/amd64")'),
        ignorefile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to custom .trivyignore file (--ignorefile)"),
        ignoreUnfixed: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only show vulnerabilities with known fixes"),
        exitCode: z
          .number()
          .optional()
          .describe("Exit code when vulnerabilities are found (--exit-code)"),
        skipDbUpdate: z
          .boolean()
          .optional()
          .describe("Skip vulnerability database update for faster scans (--skip-db-update)"),
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
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: TrivyScanResultSchema,
    },
    async ({
      target,
      scanType,
      severity,
      scanners,
      vulnType,
      skipDirs,
      skipFiles,
      platform,
      ignorefile,
      ignoreUnfixed,
      exitCode,
      skipDbUpdate,
      path,
      compact,
    }) => {
      assertNoFlagInjection(target, "target");
      if (platform) assertNoFlagInjection(platform, "platform");
      if (ignorefile) assertNoFlagInjection(ignorefile, "ignorefile");
      for (const d of skipDirs ?? []) {
        assertNoFlagInjection(d, "skipDirs");
      }
      for (const f of skipFiles ?? []) {
        assertNoFlagInjection(f, "skipFiles");
      }

      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      const args: string[] = [scanType, "--format", "json", "--quiet"];

      // Handle severity as single value or CSV array
      if (severity) {
        const severityStr = Array.isArray(severity) ? severity.join(",") : severity;
        args.push("--severity", severityStr);
      }

      // Scanners (comma-separated)
      if (scanners && scanners.length > 0) {
        args.push("--scanners", scanners.join(","));
      }

      // Vulnerability types (comma-separated)
      if (vulnType && vulnType.length > 0) {
        args.push("--vuln-type", vulnType.join(","));
      }

      // Skip directories
      for (const d of skipDirs ?? []) {
        args.push("--skip-dirs", d);
      }

      // Skip files
      for (const f of skipFiles ?? []) {
        args.push("--skip-files", f);
      }

      if (platform) {
        args.push("--platform", platform);
      }

      if (ignorefile) {
        args.push("--ignorefile", ignorefile);
      }

      if (ignoreUnfixed) {
        args.push("--ignore-unfixed");
      }

      if (exitCode !== undefined) {
        args.push("--exit-code", String(exitCode));
      }

      if (skipDbUpdate) {
        args.push("--skip-db-update");
      }

      args.push(target);

      const result = await run("trivy", args, { cwd, timeout: 300_000 });

      const data = parseTrivyJson(result.stdout, target, scanType);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatTrivyScan,
        compactTrivyScanMap,
        formatTrivyScanCompact,
        compact === false,
      );
    },
  );
}
