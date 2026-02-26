import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLazyToolManager, type LazyToolDefinition } from "../src/lazy-tools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function createMockServer(): McpServer {
  return {
    registerTool: vi.fn(),
    sendToolListChanged: vi.fn(),
  } as unknown as McpServer;
}

describe("createLazyToolManager", () => {
  let server: McpServer;

  beforeEach(() => {
    server = createMockServer();
  });

  it("starts with no deferred tools", () => {
    const manager = createLazyToolManager(server);
    expect(manager.listLazy()).toEqual([]);
    expect(manager.hasDeferredTools()).toBe(false);
  });

  it("registers a lazy tool definition", () => {
    const manager = createLazyToolManager(server);
    const def: LazyToolDefinition = {
      name: "bisect",
      description: "Binary search for a bug",
      register: vi.fn(),
    };

    manager.registerLazy(def);

    expect(manager.hasDeferredTools()).toBe(true);
    expect(manager.listLazy()).toEqual([
      { name: "bisect", description: "Binary search for a bug" },
    ]);
  });

  it("registers multiple lazy tools and lists them all", () => {
    const manager = createLazyToolManager(server);
    manager.registerLazy({
      name: "tool-a",
      description: "Tool A",
      register: vi.fn(),
    });
    manager.registerLazy({
      name: "tool-b",
      description: "Tool B",
      register: vi.fn(),
    });

    const lazy = manager.listLazy();
    expect(lazy).toHaveLength(2);
    expect(lazy.map((t) => t.name)).toEqual(["tool-a", "tool-b"]);
  });

  describe("loadTool", () => {
    it("loads a registered lazy tool and calls its register function", () => {
      const manager = createLazyToolManager(server);
      const registerFn = vi.fn();
      manager.registerLazy({
        name: "bisect",
        description: "Binary search",
        register: registerFn,
      });

      const loaded = manager.loadTool("bisect");

      expect(loaded).toBe(true);
      expect(registerFn).toHaveBeenCalledWith(server);
      expect(manager.listLazy()).toEqual([]);
      expect(manager.hasDeferredTools()).toBe(false);
    });

    it("sends tools/list_changed notification after loading", () => {
      const manager = createLazyToolManager(server);
      manager.registerLazy({
        name: "bisect",
        description: "Binary search",
        register: vi.fn(),
      });

      manager.loadTool("bisect");

      expect(server.sendToolListChanged).toHaveBeenCalledTimes(1);
    });

    it("returns false for unknown tool names", () => {
      const manager = createLazyToolManager(server);

      const loaded = manager.loadTool("nonexistent");

      expect(loaded).toBe(false);
      expect(server.sendToolListChanged).not.toHaveBeenCalled();
    });

    it("removes loaded tool from the lazy list", () => {
      const manager = createLazyToolManager(server);
      manager.registerLazy({
        name: "tool-a",
        description: "A",
        register: vi.fn(),
      });
      manager.registerLazy({
        name: "tool-b",
        description: "B",
        register: vi.fn(),
      });

      manager.loadTool("tool-a");

      expect(manager.listLazy()).toEqual([{ name: "tool-b", description: "B" }]);
    });

    it("cannot load the same tool twice", () => {
      const manager = createLazyToolManager(server);
      const registerFn = vi.fn();
      manager.registerLazy({
        name: "bisect",
        description: "Binary search",
        register: registerFn,
      });

      manager.loadTool("bisect");
      const secondLoad = manager.loadTool("bisect");

      expect(secondLoad).toBe(false);
      expect(registerFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadAll", () => {
    it("loads all pending tools and returns the count", () => {
      const manager = createLazyToolManager(server);
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      manager.registerLazy({ name: "a", description: "A", register: fn1 });
      manager.registerLazy({ name: "b", description: "B", register: fn2 });
      manager.registerLazy({ name: "c", description: "C", register: fn3 });

      const count = manager.loadAll();

      expect(count).toBe(3);
      expect(fn1).toHaveBeenCalledWith(server);
      expect(fn2).toHaveBeenCalledWith(server);
      expect(fn3).toHaveBeenCalledWith(server);
      expect(manager.listLazy()).toEqual([]);
      expect(manager.hasDeferredTools()).toBe(false);
    });

    it("sends a single tools/list_changed notification", () => {
      const manager = createLazyToolManager(server);
      manager.registerLazy({ name: "a", description: "A", register: vi.fn() });
      manager.registerLazy({ name: "b", description: "B", register: vi.fn() });

      manager.loadAll();

      expect(server.sendToolListChanged).toHaveBeenCalledTimes(1);
    });

    it("returns 0 when nothing is pending", () => {
      const manager = createLazyToolManager(server);
      const count = manager.loadAll();

      expect(count).toBe(0);
      expect(server.sendToolListChanged).not.toHaveBeenCalled();
    });
  });
});
