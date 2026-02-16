import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { makeCmd, justCmd, resolveTool } from "../lib/make-runner.js";
import {
  parseJustList,
  parseJustDumpJson,
  parseMakeTargets,
  enrichMakeTargetDescriptions,
  parsePhonyTargets,
  enrichPhonyFlags,
  buildListResult,
} from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { MakeListResultSchema } from "../schemas/index.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Attempts to use `just --dump-format json` for structured recipe parsing. */
async function tryJustJsonDump(
  cwd: string,
  file?: string,
): Promise<{
  targets: {
    name: string;
    description?: string;
    isPhony?: boolean;
    dependencies?: string[];
  }[];
  total: number;
} | null> {
  try {
    const jsonArgs = ["--dump-format", "json"];
    if (file) jsonArgs.push("--justfile", file);
    const jsonResult = await justCmd(jsonArgs, cwd);
    if (jsonResult.exitCode === 0 && jsonResult.stdout.trim()) {
      return parseJustDumpJson(jsonResult.stdout);
    }
  } catch {
    // JSON dump not supported or failed — fall back
  }
  return null;
}

/** Registers the `list` tool on the given MCP server. */
export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "Make/Just List Targets",
      description:
        "Lists available make or just targets with optional descriptions. Auto-detects make vs just. Use instead of running `make` or `just --list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        tool: z
          .enum(["auto", "make", "just"])
          .optional()
          .default("auto")
          .describe('Task runner to use: "auto" detects from files, or force "make"/"just"'),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Path to a non-default makefile or justfile (maps to make -f FILE / just --justfile FILE)",
          ),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Client-side regex filter on target names — useful for projects with many targets",
          ),
        includeSubmodules: z
          .boolean()
          .optional()
          .describe("Include recipes from justfile submodules (just --list-submodules, just only)"),
        unsorted: z
          .boolean()
          .optional()
          .describe(
            "List targets in definition order instead of alphabetical (just --unsorted, just only)",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: MakeListResultSchema,
    },
    async ({ path, tool, file, filter, includeSubmodules, unsorted, compact }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (filter) assertNoFlagInjection(filter, "filter");

      const cwd = path || process.cwd();
      const resolved = resolveTool(tool || "auto", cwd);

      let parsed: {
        targets: {
          name: string;
          description?: string;
          isPhony?: boolean;
          dependencies?: string[];
        }[];
        total: number;
      };
      let rawOutput: string;

      if (resolved === "just") {
        // Try JSON dump first for more reliable parsing (Gap #171)
        const jsonParsed = await tryJustJsonDump(cwd, file);

        if (jsonParsed) {
          parsed = jsonParsed;

          // Get --list output for raw display and optional ordering
          const listArgs = ["--list"];
          if (file) listArgs.push("--justfile", file);
          if (includeSubmodules) listArgs.push("--list-submodules");
          if (unsorted) {
            listArgs.push("--unsorted");
            // Reorder JSON-parsed targets to match --list definition order
            const listResult = await justCmd(listArgs, cwd);
            rawOutput = listResult.stdout.trim();
            const listParsed = parseJustList(listResult.stdout);
            const orderMap = new Map(listParsed.targets.map((t, i) => [t.name, i]));
            parsed.targets.sort((a, b) => {
              const aIdx = orderMap.get(a.name) ?? Infinity;
              const bIdx = orderMap.get(b.name) ?? Infinity;
              return aIdx - bIdx;
            });
          } else {
            const listResult = await justCmd(listArgs, cwd);
            rawOutput = listResult.stdout.trim();
          }
        } else {
          // Fall back to text parsing if JSON dump fails
          const justArgs = ["--list"];
          if (file) justArgs.push("--justfile", file);
          if (includeSubmodules) justArgs.push("--list-submodules");
          if (unsorted) justArgs.push("--unsorted");
          const result = await justCmd(justArgs, cwd);
          rawOutput = result.stdout.trim();
          const textParsed = parseJustList(result.stdout);
          // Mark all just targets as phony (Gap #172: just recipes are inherently phony)
          parsed = {
            targets: textParsed.targets.map((t) => ({
              ...t,
              isPhony: true as const,
            })),
            total: textParsed.total,
          };
        }
      } else {
        const makeArgs = ["-pRrq"];
        if (file) makeArgs.push("-f", file);
        makeArgs.push(":");
        const result = await makeCmd(makeArgs, cwd);
        // make -pRrq exits non-zero when the dummy target ":" fails, but still
        // prints the database to stdout. We only care about stdout.
        rawOutput = result.stdout.trim();
        parsed = parseMakeTargets(result.stdout);

        // Enrich targets with ## descriptions and .PHONY info from the Makefile source
        const makefilePath = file || join(cwd, "Makefile");
        try {
          const makefileSource = await readFile(makefilePath, "utf-8");
          enrichMakeTargetDescriptions(parsed.targets, makefileSource);

          // Gap #172: Extract .PHONY declarations
          const phonySet = parsePhonyTargets(makefileSource);
          enrichPhonyFlags(parsed.targets, phonySet);
        } catch {
          // Makefile not readable (e.g. generated targets only) — skip enrichment
        }
      }

      // Apply client-side filter if provided
      if (filter) {
        const re = new RegExp(filter);
        parsed.targets = parsed.targets.filter((t) => re.test(t.name));
        parsed.total = parsed.targets.length;
      }

      const data = buildListResult(parsed, resolved);
      return compactDualOutput(
        data,
        rawOutput,
        formatList,
        compactListMap,
        formatListCompact,
        compact === false,
      );
    },
  );
}
