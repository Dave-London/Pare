import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, INPUT_LIMITS, assertAllowedRoot } from "@paretools/shared";
import { parseTrivyJson } from "../lib/parsers.js";
import { formatTrivyScan, compactTrivyScanMap, formatTrivyScanCompact } from "../lib/formatters.js";
import { TrivyScanResultSchema } from "../schemas/index.js";

export function registerTrivyTool(server: McpServer) {
  server.registerTool(
    "trivy",
    {
      title: "Trivy Security Scanner",
      description:
        "Runs Trivy vulnerability/misconfiguration scanner on container images, filesystems, or IaC configs. Returns structured vulnerability data with severity summary.",
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
          .enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"])
          .optional()
          .describe("Severity filter. Default: all severities"),
        ignoreUnfixed: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only show vulnerabilities with known fixes"),
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
      outputSchema: TrivyScanResultSchema,
    },
    async ({ target, scanType, severity, ignoreUnfixed, path, compact }) => {
      const cwd = path || process.cwd();
      assertAllowedRoot(cwd, "security");

      const args: string[] = [scanType, "--format", "json", "--quiet"];

      if (severity) {
        args.push("--severity", severity);
      }

      if (ignoreUnfixed) {
        args.push("--ignore-unfixed");
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
