import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLazyToolManager, type LazyToolManager } from "./lazy-tools.js";
import { isLazyEnabled } from "./tool-filter.js";

export interface CreateServerOptions {
  /** Package name, e.g. "@paretools/git" */
  name: string;
  /** Package version, e.g. "0.8.1" */
  version: string;
  /** Human-readable server instructions for MCP clients */
  instructions: string;
  /**
   * Callback that registers all tools on the server.
   *
   * When lazy mode is active (`PARE_LAZY=true`), the second argument is a
   * `LazyToolManager` that the callback can use to defer non-core tools.
   * When lazy mode is off, the second argument is `undefined` and all tools
   * should be registered directly.
   */
  registerTools: (server: McpServer, lazyManager?: LazyToolManager) => void;
}

/**
 * Creates an MCP server with the standard Pare boilerplate:
 * instantiates McpServer, registers tools via callback, connects StdioServerTransport.
 *
 * @returns The connected McpServer instance (for testing or advanced use).
 */
export async function createServer(options: CreateServerOptions): Promise<McpServer> {
  const { name, version, instructions, registerTools } = options;

  const server = new McpServer({ name, version }, { instructions });

  const lazy = isLazyEnabled();
  const lazyManager = lazy ? createLazyToolManager(server) : undefined;

  registerTools(server, lazyManager);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
