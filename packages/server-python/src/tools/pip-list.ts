import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipListJson } from "../lib/parsers.js";
import { formatPipList, compactPipListMap, formatPipListCompact } from "../lib/formatters.js";
import { PipListSchema } from "../schemas/index.js";

export function registerPipListTool(server: McpServer) {
  server.registerTool(
    "pip-list",
    {
      title: "pip List",
      description: "Runs pip list and returns a structured list of installed packages.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Working directory"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: PipListSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const result = await pip(["list", "--format", "json"], cwd);
      const data = parsePipListJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipList,
        compactPipListMap,
        formatPipListCompact,
        compact === false,
      );
    },
  );
}
