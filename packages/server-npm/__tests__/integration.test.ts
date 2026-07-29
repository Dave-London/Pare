import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 180_000;

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
  }, 180_000);

  afterAll(async () => {
    await transport.close();
  }, 30_000);

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
      expect(Array.isArray(sc.vulnerabilities)).toBe(true);
    });
  });

  describe("silent-failure surfacing (#1024)", () => {
    let fixtureDir: string;

    beforeAll(async () => {
      const { mkdtemp, writeFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      fixtureDir = await mkdtemp(join(tmpdir(), "pare-npm-fail-"));
      // package.json with a dependency but NO lockfile and NO workspaces
      await writeFile(
        join(fixtureDir, "package.json"),
        JSON.stringify({
          name: "pare-npm-failure-fixture",
          version: "1.0.0",
          dependencies: { lodash: "^4.0.0" },
        }),
      );
    });

    afterAll(async () => {
      const { rm } = await import("node:fs/promises");
      await rm(fixtureDir, { recursive: true, force: true });
    });

    it("outdated surfaces npm failures instead of reporting 'up to date'", async () => {
      const result = await client.callTool(
        {
          name: "outdated",
          arguments: { path: fixtureDir, workspace: "nope", packageManager: "npm" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      // npm exits 1 with an {"error": ...} payload — must NOT parse as
      // "all packages up to date"
      expect(result.isError).toBe(true);
      const text = (result.content as { type: string; text: string }[])
        .map((c) => c.text)
        .join("\n");
      expect(text).toContain("outdated failed");
      expect(text.toLowerCase()).toContain("workspace");
    });

    it("audit returns a structured PareError when npm audit cannot run", async () => {
      const result = await client.callTool(
        {
          name: "audit",
          arguments: { path: fixtureDir, packageManager: "npm" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      // No lockfile → npm audit fails with ENOLOCK; previously this parsed
      // npm's {"error": ...} stdout as zero vulnerabilities (false clean)
      expect(result.isError).toBe(true);
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.isError).toBe(true);
      expect(typeof sc.category).toBe("string");
      expect(typeof sc.message).toBe("string");
      expect((sc.message as string).toLowerCase()).toContain("lockfile");
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
      expect(sc.exitCode).toEqual(expect.any(Number));
      expect(typeof sc.success).toBe("boolean");
      expect(typeof sc.stdout).toBe("string");
      expect(typeof sc.stderr).toBe("string");
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
