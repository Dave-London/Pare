import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the MCP SDK modules before importing createServer
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn(function (this: Record<string, unknown>, info: unknown, opts: unknown) {
      this._info = info;
      this._opts = opts;
      this.connect = vi.fn().mockResolvedValue(undefined);
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
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("calls registerTools with the server instance", async () => {
    const registerTools = vi.fn();

    const server = await createServer({
      name: "@paretools/foo",
      version: "0.0.1",
      instructions: "Foo server",
      registerTools,
    });

    expect(registerTools).toHaveBeenCalledTimes(1);
    expect(registerTools).toHaveBeenCalledWith(server);
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
