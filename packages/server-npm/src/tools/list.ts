import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseListJson } from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { NpmListSchema } from "../schemas/index.js";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "npm List",
      description:
        "Lists installed packages as structured dependency data. Use instead of running `npm list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        depth: z
          .number()
          .optional()
          .default(0)
          .describe("Dependency tree depth (default: 0, top-level only)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: NpmListSchema,
    },
    async ({ path, depth, compact }) => {
      const cwd = path || process.cwd();
      const result = await npm(["ls", "--json", `--depth=${depth ?? 0}`], cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`npm ls failed: ${result.stderr}`);
      }

      const list = parseListJson(result.stdout);
      return compactDualOutput(
        list,
        result.stdout,
        formatList,
        compactListMap,
        formatListCompact,
        compact === false,
      );
    },
  );
}
