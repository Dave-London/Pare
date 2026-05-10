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

  // Regression test for issue #871: search/count should accept a file path
  // for the `path` parameter without crashing with `spawn ENOTDIR`.
  describe("search with file path (issue #871)", () => {
    let fixtureDir: string;
    let fixtureFile: string;

    beforeAll(() => {
      fixtureDir = mkdtempSync(join(tmpdir(), "pare-search-file-path-"));
      fixtureFile = join(fixtureDir, "fixture.txt");
      writeFileSync(fixtureFile, "alpha\nfast-uri@3.1.2\nbeta\n");
    });

    afterAll(() => {
      rmSync(fixtureDir, { recursive: true, force: true });
    });

    it("search: accepts a file path and returns matches without ENOTDIR", async () => {
      const result = await client.callTool(
        {
          name: "search",
          arguments: {
            pattern: "fast-uri",
            path: fixtureFile,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        const text = content[0]?.text ?? "";
        // We tolerate "rg not installed", but never the spawn ENOTDIR crash.
        expect(text).not.toMatch(/ENOTDIR/);
        expect(text).toMatch(/rg|ripgrep|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.totalMatches).toBe("number");
        expect((sc.totalMatches as number) >= 1).toBe(true);
      }
    });

    it("count: accepts a file path and returns counts without ENOTDIR", async () => {
      const result = await client.callTool(
        {
          name: "count",
          arguments: {
            pattern: "fast-uri",
            path: fixtureFile,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        const text = content[0]?.text ?? "";
        expect(text).not.toMatch(/ENOTDIR/);
        expect(text).toMatch(/rg|ripgrep|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.totalMatches).toBe("number");
        expect((sc.totalMatches as number) >= 1).toBe(true);
      }
    });
  });
});
