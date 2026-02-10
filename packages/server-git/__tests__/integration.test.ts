import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/git integration", () => {
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

  it("lists all 10 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "add",
      "branch",
      "checkout",
      "commit",
      "diff",
      "log",
      "pull",
      "push",
      "show",
      "status",
    ]);
  });

  describe("status", () => {
    it("returns structured status data", async () => {
      const result = await client.callTool({ name: "status", arguments: {} });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.branch).toEqual(expect.any(String));
      expect(Array.isArray(sc.staged)).toBe(true);
      expect(Array.isArray(sc.modified)).toBe(true);
      expect(Array.isArray(sc.untracked)).toBe(true);
      expect(Array.isArray(sc.conflicts)).toBe(true);
      expect(typeof sc.clean).toBe("boolean");
    });
  });

  describe("log", () => {
    it("returns structured commit history", async () => {
      const result = await client.callTool({
        name: "log",
        arguments: { maxCount: 3 },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.commits)).toBe(true);
      expect(sc.total).toEqual(expect.any(Number));

      const commits = sc.commits as Record<string, unknown>[];
      expect(commits.length).toBeGreaterThan(0);
      expect(commits.length).toBeLessThanOrEqual(3);

      const first = commits[0];
      expect(first.hash).toEqual(expect.any(String));
      expect(first.hashShort).toEqual(expect.any(String));
      expect(first.author).toEqual(expect.any(String));
      expect(first.email).toEqual(expect.any(String));
      expect(first.date).toEqual(expect.any(String));
      expect(first.message).toEqual(expect.any(String));
    });
  });

  describe("diff", () => {
    it("returns structured diff statistics", async () => {
      const result = await client.callTool({ name: "diff", arguments: {} });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.files)).toBe(true);
      expect(sc.totalAdditions).toEqual(expect.any(Number));
      expect(sc.totalDeletions).toEqual(expect.any(Number));
      expect(sc.totalFiles).toEqual(expect.any(Number));
    });
  });

  describe("branch", () => {
    it("returns structured branch list with current", async () => {
      const result = await client.callTool({ name: "branch", arguments: {} });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.current).toEqual(expect.any(String));
      expect(Array.isArray(sc.branches)).toBe(true);

      const branches = sc.branches as Record<string, unknown>[];
      expect(branches.length).toBeGreaterThan(0);
      const current = branches.find((b) => b.current === true);
      expect(current).toBeDefined();
      expect(current!.name).toBe(sc.current);
    });
  });

  describe("show", () => {
    it("returns structured commit details with diff", async () => {
      const result = await client.callTool({
        name: "show",
        arguments: { ref: "HEAD" },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      expect(sc.author).toEqual(expect.any(String));
      expect(sc.email).toEqual(expect.any(String));
      expect(sc.date).toEqual(expect.any(String));
      expect(sc.message).toEqual(expect.any(String));

      const diff = sc.diff as Record<string, unknown>;
      expect(diff).toBeDefined();
      expect(Array.isArray(diff.files)).toBe(true);
      expect(diff.totalAdditions).toEqual(expect.any(Number));
      expect(diff.totalDeletions).toEqual(expect.any(Number));
    });
  });
});
