import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  filePatternsInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseLintJson, parseLintText } from "../lib/parsers.js";
import { formatLint, compactLintMap, formatLintCompact } from "../lib/formatters.js";
import { DenoLintResultSchema } from "../schemas/index.js";

/** Registers the `lint` tool on the given MCP server. */
export function registerLintTool(server: McpServer) {
  server.registerTool(
    "lint",
    {
      title: "Deno Lint",
      description:
        "Runs `deno lint` and returns structured diagnostics with file, line, column, code, and message.",
      inputSchema: {
        files: filePatternsInput("Files or directories to lint (default: current directory)"),
        path: projectPathInput,
        rules: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Include specific lint rules (--rules-include)"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Exclude specific lint rules (--rules-exclude)"),
        compact: compactInput,
      },
      outputSchema: DenoLintResultSchema,
    },
    async ({ files, path, rules, exclude, compact }) => {
      const cwd = path || process.cwd();

      const flags: string[] = ["lint", "--json"];

      if (rules) {
        for (const r of rules) {
          assertNoFlagInjection(r, "rules");
        }
        flags.push("--rules-include", rules.join(","));
      }

      if (exclude) {
        for (const e of exclude) {
          assertNoFlagInjection(e, "exclude");
        }
        flags.push("--rules-exclude", exclude.join(","));
      }

      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        flags.push(...files);
      }

      const result = await denoCmd(flags, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      let data;
      try {
        data = parseLintJson(result.stdout);
      } catch {
        // JSON parsing failed, fall back to text parsing
        data = parseLintText(result.stdout, result.stderr, result.exitCode);
      }

      return compactDualOutput(
        data,
        rawOutput,
        formatLint,
        compactLintMap,
        formatLintCompact,
        compact === false,
      );
    },
  );
}
