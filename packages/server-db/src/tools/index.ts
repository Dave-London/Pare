import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerPsqlQueryTool } from "./psql-query.js";
import { registerPsqlListDatabasesTool } from "./psql-list-databases.js";
import { registerMysqlQueryTool } from "./mysql-query.js";
import { registerMysqlListDatabasesTool } from "./mysql-list-databases.js";
import { registerRedisPingTool } from "./redis-ping.js";
import { registerRedisInfoTool } from "./redis-info.js";
import { registerRedisCommandTool } from "./redis-command.js";
import { registerMongoshEvalTool } from "./mongosh-eval.js";
import { registerMongoshStatsTool } from "./mongosh-stats.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "psql-query",
    description: "Executes a PostgreSQL query via psql and returns structured tabular output.",
    register: registerPsqlQueryTool,
  },
  {
    name: "psql-list-databases",
    description: "Lists all PostgreSQL databases via psql with owner, encoding, and size info.",
    register: registerPsqlListDatabasesTool,
  },
  {
    name: "mysql-query",
    description: "Executes a MySQL query and returns structured tabular output.",
    register: registerMysqlQueryTool,
  },
  {
    name: "mysql-list-databases",
    description: "Lists all MySQL databases with structured output.",
    register: registerMysqlListDatabasesTool,
  },
  {
    name: "redis-ping",
    description: "Tests Redis connectivity by sending a PING command.",
    register: registerRedisPingTool,
  },
  {
    name: "redis-info",
    description: "Gets Redis server info with structured sections (server, clients, memory, etc.).",
    register: registerRedisInfoTool,
  },
  {
    name: "redis-command",
    description: "Executes a Redis command via redis-cli and returns the response.",
    register: registerRedisCommandTool,
  },
  {
    name: "mongosh-eval",
    description: "Evaluates a MongoDB expression via mongosh and returns the output.",
    register: registerMongoshEvalTool,
  },
  {
    name: "mongosh-stats",
    description:
      "Gets MongoDB database statistics (collections, objects, data size, storage, indexes) via mongosh.",
    register: registerMongoshStatsTool,
  },
];

/** Registers all Database tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("db", name);
  const isCore = (name: string) => isCoreToolForServer("db", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "db");
  }
}
