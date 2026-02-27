import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLazyToolManager, type LazyToolManager } from "./lazy-tools.js";
import { isLazyEnabled } from "./tool-filter.js";
import { strictifyInputSchema } from "./strict-input.js";

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
 * Wraps an McpServer so that every `registerTool` call automatically applies
 * strict input validation (rejects unknown parameters) to the tool's
 * inputSchema. This prevents AI agents from silently passing wrong-but-
 * plausible parameter names (e.g. `branch` instead of `ref`).
 */
function applyStrictInputSchemas(server: McpServer): void {
  const original = server.registerTool.bind(server);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool = function (...args: any[]) {
    // The config-based overload: registerTool(name, config, callback)
    // config is always the second argument and contains inputSchema
    if (args.length >= 2 && typeof args[1] === "object" && args[1] !== null) {
      const config = args[1];
      if (config.inputSchema) {
        config.inputSchema = strictifyInputSchema(config.inputSchema);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return (original as (...a: unknown[]) => unknown)(...args);
  };
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
  applyStrictInputSchemas(server);

  const lazy = isLazyEnabled();
  const lazyManager = lazy ? createLazyToolManager(server) : undefined;

  registerTools(server, lazyManager);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
