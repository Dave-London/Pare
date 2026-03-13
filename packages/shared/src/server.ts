import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ErrorCode,
  ListResourcesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
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
 * Installs global error handlers so that uncaught exceptions and unhandled
 * rejections are written to stderr before the process exits — making "Connection
 * closed" failures diagnosable instead of silent.
 *
 * @returns The connected McpServer instance (for testing or advanced use).
 */
export async function createServer(options: CreateServerOptions): Promise<McpServer> {
  const { name, version, instructions, registerTools } = options;

  // Install global error handlers so startup/runtime crashes are visible on
  // stderr instead of silently killing the process (which MCP clients report
  // as "Connection closed" with no diagnostic info).
  installGlobalErrorHandlers(name);

  const server = new McpServer({ name, version }, { instructions });
  applyStrictInputSchemas(server);

  const lazy = isLazyEnabled();
  const lazyManager = lazy ? createLazyToolManager(server) : undefined;

  registerTools(server, lazyManager);

  // Pare servers are tool-only and register no resources. Some MCP clients
  // (e.g. OpenCode) fire `resources/read` after every structured tool call,
  // which causes a -32603 InternalError because no resource handler exists.
  // Register stub handlers so those requests receive a clean -32602 response
  // ("Resource not found") instead of the confusing generic error.
  server.server.registerCapabilities({ resources: {} });
  server.server.setRequestHandler(ListResourcesRequestSchema, () => ({ resources: [] }));
  server.server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    throw new McpError(ErrorCode.InvalidParams, `Resource not found: ${request.params.uri}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}

/**
 * Installs process-level error handlers that write to stderr before exiting.
 *
 * Without these, an uncaught exception or unhandled rejection during server
 * startup (e.g., a broken import, a Zod schema conversion failure, or a
 * missing dependency) causes a silent exit. MCP clients then report
 * "Connection closed" with no useful diagnostic information.
 *
 * These handlers are installed once per process and are idempotent.
 */
let globalHandlersInstalled = false;
function installGlobalErrorHandlers(serverName: string): void {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  process.on("uncaughtException", (err) => {
    process.stderr.write(`[${serverName}] Fatal uncaught exception: ${err.stack ?? err.message}\n`);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    process.stderr.write(`[${serverName}] Fatal unhandled rejection: ${msg}\n`);
    process.exit(1);
  });
}
