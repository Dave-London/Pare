import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { makeCmd, justCmd, resolveTool } from "../lib/make-runner.js";
import {
  parseJustList,
  parseMakeTargets,
  enrichMakeTargetDescriptions,
  buildListResult,
} from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { MakeListResultSchema } from "../schemas/index.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

      let parsed: { targets: { name: string; description?: string }[]; total: number };
      let rawOutput: string;

      if (resolved === "just") {
        const justArgs = ["--list"];
        if (file) justArgs.push("--justfile", file);
        if (includeSubmodules) justArgs.push("--list-submodules");
        if (unsorted) justArgs.push("--unsorted");
        const result = await justCmd(justArgs, cwd);
        rawOutput = result.stdout.trim();
        parsed = parseJustList(result.stdout);
      } else {
        const makeArgs = ["-pRrq"];
        if (file) makeArgs.push("-f", file);
        makeArgs.push(":");
        const result = await makeCmd(makeArgs, cwd);
        // make -pRrq exits non-zero when the dummy target ":" fails, but still
        // prints the database to stdout. We only care about stdout.
        rawOutput = result.stdout.trim();
        parsed = parseMakeTargets(result.stdout);

        // Enrich targets with ## descriptions from the Makefile source
        const makefilePath = file || join(cwd, "Makefile");
        try {
          const makefileSource = await readFile(makefilePath, "utf-8");
          enrichMakeTargetDescriptions(parsed.targets, makefileSource);
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
