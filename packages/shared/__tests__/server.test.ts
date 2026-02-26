import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { _resetProfileCache } from "../src/tool-filter.js";

// Mock the MCP SDK modules before importing createServer
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn(function (this: Record<string, unknown>, info: unknown, opts: unknown) {
      this._info = info;
      this._opts = opts;
      this.connect = vi.fn().mockResolvedValue(undefined);
      this.sendToolListChanged = vi.fn();
    }),
  };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: vi.fn(function (this: Record<string, unknown>) {
      this._type = "stdio";
    }),
  };
});

import { createServer } from "../src/server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

describe("createServer", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv.PARE_LAZY = process.env.PARE_LAZY;
    savedEnv.PARE_TOOLS = process.env.PARE_TOOLS;
    savedEnv.PARE_PROFILE = process.env.PARE_PROFILE;
    delete process.env.PARE_LAZY;
    delete process.env.PARE_TOOLS;
    delete process.env.PARE_PROFILE;
    _resetProfileCache();
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
    _resetProfileCache();
  });

  it("creates McpServer with name, version, and instructions", async () => {
    const registerTools = vi.fn();

    await createServer({
      name: "@paretools/test-server",
      version: "1.2.3",
      instructions: "A test server",
      registerTools,
    });

    expect(McpServer).toHaveBeenCalledWith(
      { name: "@paretools/test-server", version: "1.2.3" },
      { instructions: "A test server" },
    );
  });

  it("calls registerTools with server and undefined when lazy is off", async () => {
    const registerTools = vi.fn();

    const server = await createServer({
      name: "@paretools/foo",
      version: "0.0.1",
      instructions: "Foo server",
      registerTools,
    });

    expect(registerTools).toHaveBeenCalledTimes(1);
    expect(registerTools).toHaveBeenCalledWith(server, undefined);
  });

  it("passes a LazyToolManager when PARE_LAZY=true", async () => {
    process.env.PARE_LAZY = "true";
    const registerTools = vi.fn();

    const server = await createServer({
      name: "@paretools/foo",
      version: "0.0.1",
      instructions: "Foo server",
      registerTools,
    });

    expect(registerTools).toHaveBeenCalledTimes(1);
    const [srv, lazyMgr] = registerTools.mock.calls[0];
    expect(srv).toBe(server);
    expect(lazyMgr).toBeDefined();
    expect(typeof lazyMgr.registerLazy).toBe("function");
    expect(typeof lazyMgr.loadTool).toBe("function");
    expect(typeof lazyMgr.loadAll).toBe("function");
    expect(typeof lazyMgr.listLazy).toBe("function");
  });

  it("connects StdioServerTransport", async () => {
    const registerTools = vi.fn();

    const server = await createServer({
      name: "@paretools/bar",
      version: "0.1.0",
      instructions: "Bar server",
      registerTools,
    });

    expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    expect(server.connect).toHaveBeenCalledTimes(1);
    // Verify it was called with a StdioServerTransport instance
    const transportArg = (server.connect as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(transportArg).toHaveProperty("_type", "stdio");
  });

  it("returns the McpServer instance", async () => {
    const registerTools = vi.fn();

    const server = await createServer({
      name: "@paretools/baz",
      version: "2.0.0",
      instructions: "Baz server",
      registerTools,
    });

    expect(server).toBeDefined();
    expect((server as unknown as Record<string, unknown>)._info).toEqual({
      name: "@paretools/baz",
      version: "2.0.0",
    });
  });

  it("calls registerTools before connecting transport", async () => {
    const callOrder: string[] = [];
    const registerTools = vi.fn(() => callOrder.push("register"));

    // Override connect for this specific instance to track ordering
    vi.mocked(McpServer).mockImplementationOnce(function (
      this: Record<string, unknown>,
      info: unknown,
      opts: unknown,
    ) {
      this._info = info;
      this._opts = opts;
      this.connect = vi.fn().mockImplementation(() => {
        callOrder.push("connect");
        return Promise.resolve();
      });
    });

    await createServer({
      name: "@paretools/order-test",
      version: "0.0.1",
      instructions: "Order test",
      registerTools,
    });

    expect(callOrder).toEqual(["register", "connect"]);
  });
});
