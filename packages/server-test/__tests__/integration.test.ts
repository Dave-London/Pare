import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/test integration", () => {
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

  it("lists all 2 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["coverage", "run"]);
  });

  describe("run", () => {
    it("runs vitest on the server-git package and returns structured results", async () => {
      const gitPkgPath = resolve(__dirname, "../../server-git");
      const result = await client.callTool({
        name: "run",
        arguments: { path: gitPkgPath, framework: "vitest" },
      });

      expect(result.content).toBeDefined();

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.framework).toBe("vitest");

      const summary = sc.summary as Record<string, unknown>;
      expect(summary).toBeDefined();
      expect(summary.total).toEqual(expect.any(Number));
      expect(summary.passed).toEqual(expect.any(Number));
      expect(summary.failed).toEqual(expect.any(Number));
      expect(summary.skipped).toEqual(expect.any(Number));
      expect(summary.duration).toEqual(expect.any(Number));
      expect(summary.total as number).toBeGreaterThan(0);
      expect(summary.failed).toBe(0);

      expect(Array.isArray(sc.failures)).toBe(true);
      expect((sc.failures as unknown[]).length).toBe(0);
    }, 30_000);

    it("returns error for directory with no test framework", async () => {
      const result = await client.callTool({
        name: "run",
        arguments: { path: resolve(__dirname, "../../tsconfig") },
      });

      // MCP returns errors in the content with isError flag
      expect(result.isError).toBe(true);
    });
  });

  describe("coverage", () => {
    it("runs coverage on the server-git package", async () => {
      const gitPkgPath = resolve(__dirname, "../../server-git");
      const result = await client.callTool({
        name: "coverage",
        arguments: { path: gitPkgPath, framework: "vitest" },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.framework).toBe("vitest");

      const summary = sc.summary as Record<string, unknown>;
      expect(summary).toBeDefined();
      expect(summary.lines).toEqual(expect.any(Number));
    }, 60_000);
  });
});
