import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export interface CreateServerOptions {
  /** Package name, e.g. "@paretools/git" */
  name: string;
  /** Package version, e.g. "0.8.1" */
  version: string;
  /** Human-readable server instructions for MCP clients */
  instructions: string;
  /** Callback that registers all tools on the server */
  registerTools: (server: McpServer) => void;
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

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
