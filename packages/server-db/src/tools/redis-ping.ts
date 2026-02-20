import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { redisCmd } from "../lib/db-runner.js";
import { parseRedisPing } from "../lib/parsers.js";
import { formatRedisPing, compactRedisPingMap, formatRedisPingCompact } from "../lib/formatters.js";
import { RedisPingResultSchema } from "../schemas/index.js";

/** Registers the `redis-ping` tool on the given MCP server. */
export function registerRedisPingTool(server: McpServer) {
  server.registerTool(
    "redis-ping",
    {
      title: "Redis Ping",
      description: "Tests Redis connectivity by sending a PING command.",
      inputSchema: {
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Redis host"),
        port: z.number().optional().describe("Redis port (default: 6379)"),
        password: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Redis password (AUTH)"),
        compact: compactInput,
      },
      outputSchema: RedisPingResultSchema,
    },
    async ({ host, port, password, compact }) => {
      if (host) assertNoFlagInjection(host, "host");

      const args: string[] = [];
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-p", String(port));
      if (password) args.push("-a", password);
      args.push("PING");

      const start = Date.now();
      const result = await redisCmd(args);
      const duration = Date.now() - start;

      const data = parseRedisPing(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRedisPing,
        compactRedisPingMap,
        formatRedisPingCompact,
        compact === false,
      );
    },
  );
}
