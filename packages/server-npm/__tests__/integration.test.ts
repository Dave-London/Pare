import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 120_000;

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

  it("lists all 10 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "audit",
      "info",
      "init",
      "install",
      "list",
      "nvm",
      "outdated",
      "run",
      "search",
      "test",
    ]);
  });

  it("tools accept packageManager input", async () => {
    const { tools } = await client.listTools();
    // All tools except search should have packageManager input
    const toolsWithPm = tools.filter(
      (t) =>
        t.inputSchema &&
        typeof t.inputSchema === "object" &&
        "properties" in t.inputSchema &&
        t.inputSchema.properties &&
        typeof t.inputSchema.properties === "object" &&
        "packageManager" in t.inputSchema.properties,
    );
    const pmNames = toolsWithPm.map((t) => t.name).sort();
    // search does not have packageManager (always uses npm)
    expect(pmNames).toEqual([
      "audit",
      "info",
      "init",
      "install",
      "list",
      "outdated",
      "run",
      "test",
    ]);
  });

  describe("list", () => {
    it("returns structured dependency data", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool(
        {
          name: "list",
          arguments: { path: repoRoot },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.name).toEqual(expect.any(String));
      expect(sc.version).toEqual(expect.any(String));
      expect(sc.total).toEqual(expect.any(Number));
      expect(typeof sc.dependencies).toBe("object");
    });

    it("includes packageManager in output", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool(
        {
          name: "list",
          arguments: { path: repoRoot },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      // Should auto-detect and include the package manager used
      expect(["npm", "pnpm", "yarn"]).toContain(sc.packageManager);
    });
  });

  describe("outdated", () => {
    it("returns structured outdated data", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool(
        {
          name: "outdated",
          arguments: { path: repoRoot },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError || !result.structuredContent) {
        // npm outdated may fail or return text-only on some platforms
        expect(result.content).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc.total).toEqual(expect.any(Number));
        expect(Array.isArray(sc.packages)).toBe(true);
      }
    });
  });

  describe("audit", () => {
    it("returns structured audit data", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool(
        {
          name: "audit",
          arguments: { path: repoRoot },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.summary).toBeDefined();
      expect(Array.isArray(sc.vulnerabilities)).toBe(true);

      const summary = sc.summary as Record<string, unknown>;
      expect(summary.total).toEqual(expect.any(Number));
      expect(summary.critical).toEqual(expect.any(Number));
      expect(summary.high).toEqual(expect.any(Number));
    });
  });

  describe("run", () => {
    it("returns structured run data for a valid script", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        {
          name: "run",
          arguments: { path: pkgPath, script: "build" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.script).toBe("build");
      expect(sc.exitCode).toEqual(expect.any(Number));
      expect(typeof sc.success).toBe("boolean");
      expect(typeof sc.stdout).toBe("string");
      expect(typeof sc.stderr).toBe("string");
      expect(sc.duration).toEqual(expect.any(Number));
    });

    it("returns failure for a missing script", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool(
        {
          name: "run",
          arguments: { path: pkgPath, script: "nonexistent-script-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.script).toBe("nonexistent-script-xyz");
      expect(sc.success).toBe(false);
      expect(sc.exitCode).not.toBe(0);
    });
  });

  describe("init", () => {
    it("returns structured init data", async () => {
      // Use a temporary directory to avoid polluting the repo
      const { mkdtemp, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const tempDir = await mkdtemp(join(tmpdir(), "pare-npm-init-"));
      try {
        const result = await client.callTool(
          {
            name: "init",
            arguments: { path: tempDir, yes: true },
          },
          undefined,
          { timeout: CALL_TIMEOUT },
        );

        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.packageName).toBe("string");
        expect(typeof sc.version).toBe("string");
        expect(typeof sc.path).toBe("string");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
