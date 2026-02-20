import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerPsqlQueryTool } from "./psql-query.js";
import { registerPsqlListDatabasesTool } from "./psql-list-databases.js";
import { registerMysqlQueryTool } from "./mysql-query.js";
import { registerMysqlListDatabasesTool } from "./mysql-list-databases.js";
import { registerRedisPingTool } from "./redis-ping.js";
import { registerRedisInfoTool } from "./redis-info.js";
import { registerRedisCommandTool } from "./redis-command.js";
import { registerMongoshEvalTool } from "./mongosh-eval.js";
import { registerMongoshStatsTool } from "./mongosh-stats.js";

/** Registers all DB tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("db", name);
  if (s("psql-query")) registerPsqlQueryTool(server);
  if (s("psql-list-databases")) registerPsqlListDatabasesTool(server);
  if (s("mysql-query")) registerMysqlQueryTool(server);
  if (s("mysql-list-databases")) registerMysqlListDatabasesTool(server);
  if (s("redis-ping")) registerRedisPingTool(server);
  if (s("redis-info")) registerRedisInfoTool(server);
  if (s("redis-command")) registerRedisCommandTool(server);
  if (s("mongosh-eval")) registerMongoshEvalTool(server);
  if (s("mongosh-stats")) registerMongoshStatsTool(server);
}
