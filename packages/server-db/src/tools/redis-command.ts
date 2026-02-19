import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { redisCmd } from "../lib/db-runner.js";
import { parseRedisCommand } from "../lib/parsers.js";
import {
  formatRedisCommand,
  compactRedisCommandMap,
  formatRedisCommandCompact,
} from "../lib/formatters.js";
import { RedisCommandResultSchema } from "../schemas/index.js";

/** Registers the `redis-command` tool on the given MCP server. */
export function registerRedisCommandTool(server: McpServer) {
  server.registerTool(
    "redis-command",
    {
      title: "Redis Command",
      description:
        "Executes a Redis command via redis-cli and returns the response. " +
        "WARNING: The command is executed as-is — do not pass untrusted input.",
      inputSchema: {
        command: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Redis command to execute (e.g., GET, SET, KEYS, DBSIZE)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Arguments for the Redis command"),
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Redis host"),
        port: z.number().optional().describe("Redis port (default: 6379)"),
        password: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Redis password (AUTH)"),
        db: z.number().optional().describe("Redis database number"),
        compact: compactInput,
      },
      outputSchema: RedisCommandResultSchema,
    },
    async ({ command, args, host, port, password, db, compact }) => {
      assertNoFlagInjection(command, "command");

      const cliArgs: string[] = [];
      if (host) {
        assertNoFlagInjection(host, "host");
        cliArgs.push("-h", host);
      }
      if (port !== undefined) cliArgs.push("-p", String(port));
      if (password) cliArgs.push("-a", password);
      if (db !== undefined) cliArgs.push("-n", String(db));
      cliArgs.push(command, ...(args || []));

      const start = Date.now();
      const result = await redisCmd(cliArgs);
      const duration = Date.now() - start;

      const data = parseRedisCommand(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRedisCommand,
        compactRedisCommandMap,
        formatRedisCommandCompact,
        compact === false,
      );
    },
  );
}
