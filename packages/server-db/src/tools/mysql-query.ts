import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { mysqlCmd } from "../lib/db-runner.js";
import { parseMysqlQuery } from "../lib/parsers.js";
import {
  formatMysqlQuery,
  compactMysqlQueryMap,
  formatMysqlQueryCompact,
} from "../lib/formatters.js";
import { MysqlQueryResultSchema } from "../schemas/index.js";

/** Registers the `mysql-query` tool on the given MCP server. */
export function registerMysqlQueryTool(server: McpServer) {
  server.registerTool(
    "mysql-query",
    {
      title: "MySQL Query",
      description:
        "Executes a MySQL query and returns structured tabular output. " +
        "WARNING: The query is executed as-is against the target database — do not pass untrusted input.",
      inputSchema: {
        query: z.string().max(INPUT_LIMITS.STRING_MAX).describe("SQL query to execute"),
        database: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Database name to connect to"),
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database host"),
        port: z.number().optional().describe("Database port (default: 3306)"),
        user: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database user"),
        compact: compactInput,
      },
      outputSchema: MysqlQueryResultSchema,
    },
    async ({ query, database, host, port, user, compact }) => {
      if (database) assertNoFlagInjection(database, "database");
      if (host) assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");

      const args: string[] = ["--batch", "--raw", "-e", query];
      if (database) args.push(database);
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-P", String(port));
      if (user) args.push("-u", user);

      const start = Date.now();
      const result = await mysqlCmd(args);
      const duration = Date.now() - start;

      const data = parseMysqlQuery(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatMysqlQuery,
        compactMysqlQueryMap,
        formatMysqlQueryCompact,
        compact === false,
      );
    },
  );
}
