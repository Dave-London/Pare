import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/npm integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
  });

  it("lists all 7 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["audit", "init", "install", "list", "outdated", "run", "test"]);
  });

  describe("list", () => {
    it("returns structured dependency data", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool({
        name: "list",
        arguments: { path: repoRoot },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.name).toEqual(expect.any(String));
      expect(sc.version).toEqual(expect.any(String));
      expect(sc.total).toEqual(expect.any(Number));
      expect(typeof sc.dependencies).toBe("object");
    });
  });

  describe("outdated", () => {
    it("returns structured outdated data", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool({
        name: "outdated",
        arguments: { path: repoRoot },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(Array.isArray(sc.packages)).toBe(true);
    });
  });
});
