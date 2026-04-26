import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 180_000;

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
  }, 180_000);

  afterAll(async () => {
    await transport.close();
  }, 30_000);

  describe("search with file path (issue #827)", () => {
    let tmpRoot: string;
    let filePath: string;

    beforeAll(() => {
      tmpRoot = mkdtempSync(join(tmpdir(), "pare-search-file-path-"));
      filePath = join(tmpRoot, "data.txt");
      writeFileSync(filePath, "alpha\nbeta hono@1.0.0\ngamma hono@2.0.0\n");
    });

    afterAll(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("accepts a file path without crashing with spawn ENOTDIR", async () => {
      const result = await client.callTool(
        {
          name: "search",
          arguments: { pattern: "hono@", path: filePath, maxResults: 10 },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        const text = content[0]?.text ?? "";
        // Tolerate environments where rg isn't installed, but never the
        // ENOTDIR symptom that this fix targets.
        expect(text).not.toMatch(/ENOTDIR/);
        expect(text).toMatch(/rg|ripgrep|command|not found|ENOENT/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.totalMatches).toBe(2);
      }
    });

    it("returns a clear error when the path does not exist", async () => {
      const missing = join(tmpRoot, "no-such-file.txt");
      const result = await client.callTool(
        {
          name: "search",
          arguments: { pattern: "x", path: missing },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      const text = content[0]?.text ?? "";
      expect(text).toMatch(/path does not exist/);
      expect(text).not.toMatch(/ENOTDIR/);
    });
  });

  describe("count with file path (issue #827)", () => {
    let tmpRoot: string;
    let filePath: string;

    beforeAll(() => {
      tmpRoot = mkdtempSync(join(tmpdir(), "pare-count-file-path-"));
      filePath = join(tmpRoot, "data.txt");
      writeFileSync(filePath, "x\nx\ny\nx\n");
    });

    afterAll(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("accepts a file path without crashing with spawn ENOTDIR", async () => {
      const result = await client.callTool(
        {
          name: "count",
          arguments: { pattern: "x", path: filePath },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        const text = content[0]?.text ?? "";
        expect(text).not.toMatch(/ENOTDIR/);
        expect(text).toMatch(/rg|ripgrep|command|not found|ENOENT/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        const totalMatches = sc.totalMatches as number | undefined;
        expect(totalMatches).toBe(3);
      }
    });
  });

  describe("find with file path (issue #827)", () => {
    let tmpRoot: string;
    let filePath: string;

    beforeAll(() => {
      tmpRoot = mkdtempSync(join(tmpdir(), "pare-find-file-path-"));
      filePath = join(tmpRoot, "data.txt");
      writeFileSync(filePath, "irrelevant\n");
    });

    afterAll(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("rejects a file path with a typed error rather than spawn ENOTDIR", async () => {
      const result = await client.callTool(
        {
          name: "find",
          arguments: { pattern: "x", path: filePath },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      const text = content[0]?.text ?? "";
      expect(text).toMatch(/path must be a directory/);
      expect(text).not.toMatch(/ENOTDIR/);
    });
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
        expect(typeof sc.fileCount).toBe("number");
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
      }
    });
  });
});
