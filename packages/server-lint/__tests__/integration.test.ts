import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/lint integration", () => {
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

  it("lists all 7 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "biome-check",
      "biome-format",
      "format-check",
      "lint",
      "oxlint",
      "prettier-format",
      "stylelint",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("lint", () => {
    it("returns structured ESLint diagnostics", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "lint",
        arguments: { path: pkgPath, patterns: ["src/"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.fixable).toEqual(expect.any(Number));
      expect(sc.filesChecked).toEqual(expect.any(Number));
      // diagnostics may be omitted in compact mode
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    }, 60_000);
  });

  describe("format-check", () => {
    it("returns structured Prettier check result", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "format-check",
        arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.formatted).toBe("boolean");
      expect(sc.total).toEqual(expect.any(Number));
      // files may be omitted in compact mode
      expect(sc.files === undefined || Array.isArray(sc.files)).toBe(true);
    }, 60_000);
  });

  describe("prettier-format", () => {
    it("returns structured Prettier write result", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "prettier-format",
        // Use --check on a single known-formatted file to avoid modifying files
        arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      // files may be omitted in compact mode
      expect(sc.files === undefined || Array.isArray(sc.files)).toBe(true);
    }, 60_000);
  });

  describe("biome-check", () => {
    it("returns structured result even when biome is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "biome-check",
        arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.fixable).toEqual(expect.any(Number));
      // diagnostics may be omitted in compact mode
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    }, 60_000);
  });

  describe("biome-format", () => {
    it("returns structured result even when biome is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "biome-format",
        arguments: { path: pkgPath, patterns: ["src/lib/formatters.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      // files may be omitted in compact mode
      expect(sc.files === undefined || Array.isArray(sc.files)).toBe(true);
    }, 60_000);
  });

  describe("stylelint", () => {
    it("returns structured result even when stylelint is not configured", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "stylelint",
        arguments: { path: pkgPath, patterns: ["."] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.fixable).toEqual(expect.any(Number));
      // diagnostics may be omitted in compact mode
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    }, 60_000);
  });

  describe("oxlint", () => {
    it("returns structured result even when oxlint is not installed", async () => {
      const pkgPath = resolve(__dirname, "..");
      const result = await client.callTool({
        name: "oxlint",
        arguments: { path: pkgPath, patterns: ["src/"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
      expect(sc.fixable).toEqual(expect.any(Number));
      // diagnostics may be omitted in compact mode
      expect(sc.diagnostics === undefined || Array.isArray(sc.diagnostics)).toBe(true);
    }, 60_000);
  });
});
