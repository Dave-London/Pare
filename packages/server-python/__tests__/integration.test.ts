import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/python integration", () => {
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

  it("lists all 4 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["mypy", "pip-audit", "pip-install", "ruff-check"]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("ruff-check", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "ruff-check",
        arguments: { path: resolve(__dirname, "../../..") },
      });

      if (result.isError) {
        // ruff not installed — verify meaningful error
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/ruff|command|not found/i);
      } else {
        // ruff is available — verify structured output
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.fixable).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });
});
