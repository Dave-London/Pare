import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { makeCmd, justCmd, resolveTool } from "../lib/make-runner.js";
import { parseJustList, parseMakeTargets, buildListResult } from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { MakeListResultSchema } from "../schemas/index.js";

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
    async ({ path, tool, compact }) => {
      const cwd = path || process.cwd();
      const resolved = resolveTool(tool || "auto", cwd);

      let parsed: { targets: { name: string; description?: string }[]; total: number };
      let rawOutput: string;

      if (resolved === "just") {
        const result = await justCmd(["--list"], cwd);
        rawOutput = result.stdout.trim();
        parsed = parseJustList(result.stdout);
      } else {
        const result = await makeCmd(["-pRrq", ":"], cwd);
        // make -pRrq exits non-zero when the dummy target ":" fails, but still
        // prints the database to stdout. We only care about stdout.
        rawOutput = result.stdout.trim();
        parsed = parseMakeTargets(result.stdout);
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
