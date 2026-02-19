import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { mysqlCmd } from "../lib/db-runner.js";
import { parseMysqlListDatabases } from "../lib/parsers.js";
import {
  formatMysqlListDatabases,
  compactMysqlListDatabasesMap,
  formatMysqlListDatabasesCompact,
} from "../lib/formatters.js";
import { MysqlListDatabasesResultSchema } from "../schemas/index.js";

/** Registers the `mysql-list-databases` tool on the given MCP server. */
export function registerMysqlListDatabasesTool(server: McpServer) {
  server.registerTool(
    "mysql-list-databases",
    {
      title: "MySQL List Databases",
      description: "Lists all MySQL databases with structured output.",
      inputSchema: {
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database host"),
        port: z.number().optional().describe("Database port (default: 3306)"),
        user: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database user"),
        compact: compactInput,
      },
      outputSchema: MysqlListDatabasesResultSchema,
    },
    async ({ host, port, user, compact }) => {
      if (host) assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");

      const args: string[] = ["--batch", "-e", "SHOW DATABASES"];
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-P", String(port));
      if (user) args.push("-u", user);

      const start = Date.now();
      const result = await mysqlCmd(args);
      const duration = Date.now() - start;

      const data = parseMysqlListDatabases(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatMysqlListDatabases,
        compactMysqlListDatabasesMap,
        formatMysqlListDatabasesCompact,
        compact === false,
      );
    },
  );
}
