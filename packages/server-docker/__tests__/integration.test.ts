import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/docker integration", () => {
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

  it("lists all 9 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "build",
      "compose-down",
      "compose-up",
      "exec",
      "images",
      "logs",
      "ps",
      "pull",
      "run",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("ps", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "ps",
        arguments: {},
      });

      if (result.isError) {
        // Docker not installed — verify we get a meaningful error
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/docker|command|not found/i);
      } else {
        // Docker is available — verify structured output
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.containers)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.running).toEqual(expect.any(Number));
        expect(sc.stopped).toEqual(expect.any(Number));
      }
    });
  });

  describe("images", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "images",
        arguments: {},
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/docker|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.images)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("run", () => {
    it("rejects flag injection in image param", async () => {
      const result = await client.callTool({
        name: "run",
        arguments: { image: "--privileged" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid image|argument injection/i);
    });
  });

  describe("exec", () => {
    it("rejects flag injection in container param", async () => {
      const result = await client.callTool({
        name: "exec",
        arguments: { container: "--privileged", command: ["ls"] },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid container|argument injection/i);
    });
  });

  describe("pull", () => {
    it("rejects flag injection in image param", async () => {
      const result = await client.callTool({
        name: "pull",
        arguments: { image: "--all-tags" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid image|argument injection/i);
    });
  });

  describe("compose-up", () => {
    it("returns error or structured data when called without docker", async () => {
      const result = await client.callTool({
        name: "compose-up",
        arguments: { path: "C:\\nonexistent-path-for-testing" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/docker|compose|not found|failed|error|no configuration/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.started).toBe("number");
        expect(Array.isArray(sc.services)).toBe(true);
      }
    });
  });

  describe("compose-down", () => {
    it("returns error or structured data when called without docker", async () => {
      const result = await client.callTool({
        name: "compose-down",
        arguments: { path: "C:\\nonexistent-path-for-testing" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/docker|compose|not found|failed|error|no configuration/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.stopped).toBe("number");
        expect(typeof sc.removed).toBe("number");
      }
    });
  });
});
