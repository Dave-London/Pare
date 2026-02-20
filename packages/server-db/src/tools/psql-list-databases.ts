import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { psqlCmd } from "../lib/db-runner.js";
import { parsePsqlListDatabases } from "../lib/parsers.js";
import {
  formatPsqlListDatabases,
  compactPsqlListDatabasesMap,
  formatPsqlListDatabasesCompact,
} from "../lib/formatters.js";
import { PsqlListDatabasesResultSchema } from "../schemas/index.js";

/** Registers the `psql-list-databases` tool on the given MCP server. */
export function registerPsqlListDatabasesTool(server: McpServer) {
  server.registerTool(
    "psql-list-databases",
    {
      title: "PostgreSQL List Databases",
      description: "Lists all PostgreSQL databases via psql with owner, encoding, and size info.",
      inputSchema: {
        host: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database host"),
        port: z.number().optional().describe("Database port (default: 5432)"),
        user: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Database user"),
        compact: compactInput,
      },
      outputSchema: PsqlListDatabasesResultSchema,
    },
    async ({ host, port, user, compact }) => {
      if (host) assertNoFlagInjection(host, "host");
      if (user) assertNoFlagInjection(user, "user");

      const args: string[] = ["-l", "-A"];
      if (host) args.push("-h", host);
      if (port !== undefined) args.push("-p", String(port));
      if (user) args.push("-U", user);

      const start = Date.now();
      const result = await psqlCmd(args);
      const duration = Date.now() - start;

      const data = parsePsqlListDatabases(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatPsqlListDatabases,
        compactPsqlListDatabasesMap,
        formatPsqlListDatabasesCompact,
        compact === false,
      );
    },
  );
}
