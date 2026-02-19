import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { mongoshCmd } from "../lib/db-runner.js";
import { parseMongoshStats } from "../lib/parsers.js";
import {
  formatMongoshStats,
  compactMongoshStatsMap,
  formatMongoshStatsCompact,
} from "../lib/formatters.js";
import { MongoshStatsResultSchema } from "../schemas/index.js";

/** Registers the `mongosh-stats` tool on the given MCP server. */
export function registerMongoshStatsTool(server: McpServer) {
  server.registerTool(
    "mongosh-stats",
    {
      title: "MongoDB Stats",
      description:
        "Gets MongoDB database statistics (collections, objects, data size, storage, indexes) via mongosh.",
      inputSchema: {
        uri: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("MongoDB connection URI (e.g., mongodb://localhost:27017/mydb)"),
        compact: compactInput,
      },
      outputSchema: MongoshStatsResultSchema,
    },
    async ({ uri, compact }) => {
      if (uri) assertNoFlagInjection(uri, "uri");

      const args: string[] = ["--quiet", "--eval", "JSON.stringify(db.stats())"];
      if (uri) args.push(uri);

      const start = Date.now();
      const result = await mongoshCmd(args);
      const duration = Date.now() - start;

      const data = parseMongoshStats(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatMongoshStats,
        compactMongoshStatsMap,
        formatMongoshStatsCompact,
        compact === false,
      );
    },
  );
}
