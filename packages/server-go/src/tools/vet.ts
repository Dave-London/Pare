import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoVetOutput } from "../lib/parsers.js";
import { formatGoVet, compactVetMap, formatVetCompact } from "../lib/formatters.js";
import { GoVetResultSchema } from "../schemas/index.js";

/** Registers the `vet` tool on the given MCP server. */
export function registerVetTool(server: McpServer) {
  server.registerTool(
    "vet",
    {
      title: "Go Vet",
      description:
        "Runs go vet and returns structured static analysis diagnostics with analyzer names. Uses -json flag for native JSON output with automatic text fallback. Use instead of running `go vet` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("Packages to vet (default: ./...)"),
        analyzers: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Specific analyzers to enable or disable. Prefix with '-' to disable. Example: ['shadow', '-printf']",
          ),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags for correct vetting of conditionally compiled code (-tags)"),
        contextLines: z
          .number()
          .int()
          .min(0)
          .max(50)
          .optional()
          .describe("Number of context lines to include around each diagnostic (-c=N)"),
        vettool: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a custom analyzer tool binary (-vettool)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoVetResultSchema,
    },
    async ({ path, packages, analyzers, tags, contextLines, vettool, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (vettool) assertNoFlagInjection(vettool, "vettool");

      const args = ["vet", "-json"];
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        args.push("-tags", tags.join(","));
      }
      if (contextLines !== undefined) args.push(`-c=${contextLines}`);
      if (vettool) args.push(`-vettool=${vettool}`);
      if (analyzers && analyzers.length > 0) {
        for (const a of analyzers) {
          assertNoFlagInjection(a, "analyzers");
          // Analyzers are passed as -<name> (disable) or -<name>=true (enable)
          if (a.startsWith("-")) {
            // Disable: go vet -<name>=false
            args.push(`${a}=false`);
          } else {
            // Enable: go vet -<name>
            args.push(`-${a}`);
          }
        }
      }
      args.push(...(packages || ["./..."]));
      const result = await goCmd(args, cwd);
      const data = parseGoVetOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoVet,
        compactVetMap,
        formatVetCompact,
        compact === false,
      );
    },
  );
}
