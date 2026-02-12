/**
 * Tool parameter tests: verify that run/coverage tools handle parameters
 * correctly (filter, args, nonexistent paths).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("tool parameter handling", () => {
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

  describe("run tool", () => {
    it("accepts filter parameter and passes it to the framework", async () => {
      const gitPkgPath = resolve(__dirname, "../../server-git");
      // Use a filter that matches a specific test file pattern
      const result = await client.callTool({
        name: "run",
        arguments: { path: gitPkgPath, framework: "vitest", filter: "parsers" },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.framework).toBe("vitest");

      const summary = sc.summary as Record<string, unknown>;
      expect(summary).toBeDefined();
      expect(summary.total).toEqual(expect.any(Number));
      // With a filter, we should get some tests (fewer than the full suite)
      expect(summary.total as number).toBeGreaterThan(0);
    }, 60_000);

    it("accepts custom args parameter and passes them through", async () => {
      const gitPkgPath = resolve(__dirname, "../../server-git");
      // Pass a safe (non-flag) arg — file path pattern to limit test scope
      const result = await client.callTool({
        name: "run",
        arguments: { path: gitPkgPath, framework: "vitest", args: ["parsers"] },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.framework).toBe("vitest");

      const summary = sc.summary as Record<string, unknown>;
      expect(summary.total).toEqual(expect.any(Number));
    }, 60_000);

    it("rejects flag-like args to prevent argument injection", async () => {
      const gitPkgPath = resolve(__dirname, "../../server-git");
      // Flag-like args must be rejected by assertNoFlagInjection
      const result = await client.callTool({
        name: "run",
        arguments: { path: gitPkgPath, framework: "vitest", args: ["--bail", "1"] },
      });

      expect(result.isError).toBe(true);
    }, 15_000);

    it("returns error for nonexistent path", async () => {
      const result = await client.callTool({
        name: "run",
        arguments: { path: resolve(__dirname, "../../nonexistent-package-xyz") },
      });

      // MCP returns errors in the content with isError flag
      expect(result.isError).toBe(true);
    }, 15_000);
  });

  describe("coverage tool", () => {
    it("returns error for nonexistent path", async () => {
      const result = await client.callTool({
        name: "coverage",
        arguments: { path: resolve(__dirname, "../../nonexistent-package-xyz") },
      });

      expect(result.isError).toBe(true);
    }, 15_000);
  });
});
