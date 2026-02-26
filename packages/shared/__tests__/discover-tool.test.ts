import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerDiscoverTool } from "../src/discover-tool.js";
import { createLazyToolManager } from "../src/lazy-tools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function createMockServer() {
  const registeredTools = new Map<string, { config: unknown; handler: Function }>();

  return {
    registerTool: vi.fn((name: string, config: unknown, handler: Function) => {
      registeredTools.set(name, { config, handler });
    }),
    sendToolListChanged: vi.fn(),
    _registeredTools: registeredTools,
  } as unknown as McpServer & {
    _registeredTools: Map<string, { config: unknown; handler: Function }>;
  };
}

describe("registerDiscoverTool", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
  });

  it("registers a discover-tools tool on the server", () => {
    const manager = createLazyToolManager(server);
    registerDiscoverTool(server, manager, "git");

    expect(server.registerTool).toHaveBeenCalledTimes(1);
    const call = vi.mocked(server.registerTool).mock.calls[0];
    expect(call[0]).toBe("discover-tools");
  });

  it("includes server name in description", () => {
    const manager = createLazyToolManager(server);
    registerDiscoverTool(server, manager, "git");

    const config = vi.mocked(server.registerTool).mock.calls[0][1] as Record<string, unknown>;
    expect(config.description).toContain("git");
  });

  it("lists available lazy tools when called with no args", async () => {
    const manager = createLazyToolManager(server);
    manager.registerLazy({
      name: "bisect",
      description: "Binary search for a bug",
      register: vi.fn(),
    });
    manager.registerLazy({
      name: "worktree",
      description: "Manage worktrees",
      register: vi.fn(),
    });

    registerDiscoverTool(server, manager, "git");
    const handler = server._registeredTools.get("discover-tools")!.handler;
    const result = await handler({});

    expect(result.structuredContent.available).toEqual([
      { name: "bisect", description: "Binary search for a bug" },
      { name: "worktree", description: "Manage worktrees" },
    ]);
    expect(result.structuredContent.loaded).toEqual([]);
    expect(result.structuredContent.totalAvailable).toBe(2);
  });

  it("loads specified tools when called with load parameter", async () => {
    const manager = createLazyToolManager(server);
    const bisectRegister = vi.fn();
    manager.registerLazy({
      name: "bisect",
      description: "Binary search for a bug",
      register: bisectRegister,
    });
    manager.registerLazy({
      name: "worktree",
      description: "Manage worktrees",
      register: vi.fn(),
    });

    registerDiscoverTool(server, manager, "git");
    const handler = server._registeredTools.get("discover-tools")!.handler;
    const result = await handler({ load: ["bisect"] });

    expect(bisectRegister).toHaveBeenCalledWith(server);
    expect(result.structuredContent.loaded).toEqual(["bisect"]);
    expect(result.structuredContent.available).toEqual([
      { name: "worktree", description: "Manage worktrees" },
    ]);
    expect(result.structuredContent.totalAvailable).toBe(1);
  });

  it("skips unknown tool names in load without error", async () => {
    const manager = createLazyToolManager(server);
    manager.registerLazy({
      name: "bisect",
      description: "Binary search",
      register: vi.fn(),
    });

    registerDiscoverTool(server, manager, "git");
    const handler = server._registeredTools.get("discover-tools")!.handler;
    const result = await handler({ load: ["nonexistent", "bisect"] });

    // Only bisect was actually loaded
    expect(result.structuredContent.loaded).toEqual(["bisect"]);
  });

  it("returns human-readable content text", async () => {
    const manager = createLazyToolManager(server);
    manager.registerLazy({
      name: "bisect",
      description: "Binary search",
      register: vi.fn(),
    });

    registerDiscoverTool(server, manager, "git");
    const handler = server._registeredTools.get("discover-tools")!.handler;
    const result = await handler({});

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("bisect");
    expect(result.content[0].text).toContain("1 additional tool(s) available");
  });

  it("shows 'All tools are loaded' when none remain", async () => {
    const manager = createLazyToolManager(server);

    registerDiscoverTool(server, manager, "git");
    const handler = server._registeredTools.get("discover-tools")!.handler;
    const result = await handler({});

    expect(result.content[0].text).toContain("All tools are loaded");
  });
});
