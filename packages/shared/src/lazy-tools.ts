/**
 * Lazy tool registration — allows servers to defer loading of non-core tools
 * until they are explicitly requested via the `discover-tools` meta-tool.
 *
 * When `PARE_LAZY=true`, only core tools are registered at startup.
 * Extended tools are stored as lazy definitions and can be loaded on demand,
 * reducing the token cost of tool schemas in LLM prompts.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** Definition of a tool that can be lazily loaded on demand. */
export interface LazyToolDefinition {
  /** Tool name as registered with the MCP server. */
  name: string;
  /** Short description shown in discover-tools output. */
  description: string;
  /** Callback that registers the full tool on the server when invoked. */
  register: (server: McpServer) => void;
}

/** Manager for lazy/deferred tool registration. */
export interface LazyToolManager {
  /** Register a tool as lazy (deferred — not yet loaded). */
  registerLazy(def: LazyToolDefinition): void;
  /** Get list of all lazy (not yet loaded) tools. */
  listLazy(): Array<{ name: string; description: string }>;
  /** Load a specific lazy tool by name. Returns true if the tool was found and loaded. */
  loadTool(name: string): boolean;
  /** Load all remaining lazy tools. Returns the count of tools loaded. */
  loadAll(): number;
  /** Check if any tools were deferred. */
  hasDeferredTools(): boolean;
}

/**
 * Creates a lazy tool manager bound to the given MCP server.
 *
 * The manager stores deferred tool definitions and registers them on the
 * server when explicitly loaded. After loading, it sends the
 * `notifications/tools/list_changed` notification so clients re-fetch the
 * tool list.
 */
export function createLazyToolManager(server: McpServer): LazyToolManager {
  const pending = new Map<string, LazyToolDefinition>();

  return {
    registerLazy(def: LazyToolDefinition): void {
      pending.set(def.name, def);
    },

    listLazy(): Array<{ name: string; description: string }> {
      return Array.from(pending.values()).map((d) => ({
        name: d.name,
        description: d.description,
      }));
    },

    loadTool(name: string): boolean {
      const def = pending.get(name);
      if (!def) return false;

      def.register(server);
      pending.delete(name);
      server.sendToolListChanged();
      return true;
    },

    loadAll(): number {
      const count = pending.size;
      if (count === 0) return 0;

      for (const def of Array.from(pending.values())) {
        def.register(server);
      }
      pending.clear();
      server.sendToolListChanged();
      return count;
    },

    hasDeferredTools(): boolean {
      return pending.size > 0;
    },
  };
}
