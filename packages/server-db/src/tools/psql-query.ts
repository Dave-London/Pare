import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { psqlCmd } from "../lib/db-runner.js";
import { parsePsqlQuery } from "../lib/parsers.js";
import { formatPsqlQuery, compactPsqlQueryMap, formatPsqlQueryCompact } from "../lib/formatters.js";
import { PsqlQueryResultSchema } from "../schemas/index.js";

/** Registers the `psql-query` tool on the given MCP server. */
export function registerPsqlQueryTool(server: McpServer) {
  server.registerTool(
    "psql-query",
    {
      title: "PostgreSQL Query",
      description:
        "Executes a PostgreSQL query via psql and returns structured tabular output. " +
        "WARNING: The query is executed as-is against the target database — do not pass untrusted input.",
      inputSchema: {
        query: z.string().max(INPUT_LIMITS.STRING_MAX).describe("SQL query to execute"),
        database: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Database name to connect to"),
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database host"),
        port: z.number().optional().describe("Database port (default: 5432)"),
        user: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database user"),
        compact: compactInput,
      },
      outputSchema: PsqlQueryResultSchema,
    },
    async ({ query, database, host, port, user, compact }) => {
      if (database) assertNoFlagInjection(database, "database");
      if (host) assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");

      const args: string[] = ["-A", "-c", query];
      if (database) args.push("-d", database);
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-p", String(port));
      if (user) args.push("-U", user);

      const start = Date.now();
      const result = await psqlCmd(args);
      const duration = Date.now() - start;

      const data = parsePsqlQuery(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatPsqlQuery,
        compactPsqlQueryMap,
        formatPsqlQueryCompact,
        compact === false,
      );
    },
  );
}
