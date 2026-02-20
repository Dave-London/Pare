import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { redisCmd } from "../lib/db-runner.js";
import { parseRedisInfo } from "../lib/parsers.js";
import { formatRedisInfo, compactRedisInfoMap, formatRedisInfoCompact } from "../lib/formatters.js";
import { RedisInfoResultSchema } from "../schemas/index.js";

/** Registers the `redis-info` tool on the given MCP server. */
export function registerRedisInfoTool(server: McpServer) {
  server.registerTool(
    "redis-info",
    {
      title: "Redis Info",
      description:
        "Gets Redis server info with structured sections (server, clients, memory, etc.).",
      inputSchema: {
        section: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific info section to retrieve (e.g., server, clients, memory, stats)"),
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Redis host"),
        port: z.number().optional().describe("Redis port (default: 6379)"),
        password: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Redis password (AUTH)"),
        compact: compactInput,
      },
      outputSchema: RedisInfoResultSchema,
    },
    async ({ section, host, port, password, compact }) => {
      if (section) assertNoFlagInjection(section, "section");
      if (host) assertNoFlagInjection(host, "host");

      const args: string[] = [];
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-p", String(port));
      if (password) args.push("-a", password);
      args.push("INFO");
      if (section) args.push(section);

      const start = Date.now();
      const result = await redisCmd(args);
      const duration = Date.now() - start;

      const data = parseRedisInfo(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRedisInfo,
        compactRedisInfoMap,
        formatRedisInfoCompact,
        compact === false,
      );
    },
  );
}
