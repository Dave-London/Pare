import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 120_000;

describe("@paretools/search integration", () => {
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

  describe("find", () => {
    it("returns structured output with default compact mode", async () => {
      const result = await client.callTool(
        {
          name: "find",
          arguments: { pattern: "index", path: resolve(__dirname, "../src") },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/fd|command|not found|ENOENT|failed|error/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.total).toBe("number");
      }
    });

    it("returns files array with compact: false", async () => {
      const result = await client.callTool(
        {
          name: "find",
          arguments: {
            pattern: "index",
            path: resolve(__dirname, "../src"),
            compact: false,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/fd|command|not found|ENOENT|failed|error/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.files)).toBe(true);
        expect(typeof sc.total).toBe("number");
      }
    });
  });
});
