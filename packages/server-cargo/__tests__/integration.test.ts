import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

// A path that definitely does not contain a Rust project
const INVALID_PATH = resolve(__dirname, "../../../nonexistent-rust-project-xyz");

describe("@paretools/cargo integration", () => {
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
      "add",
      "build",
      "check",
      "clippy",
      "doc",
      "fmt",
      "remove",
      "run",
      "test",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("clippy", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "clippy",
        arguments: { path: resolve(__dirname, "../../..") },
      });

      if (result.isError) {
        // cargo not installed — verify meaningful error
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/cargo|command|not found/i);
      } else {
        // cargo is available — verify structured output
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.errors).toEqual(expect.any(Number));
        expect(sc.warnings).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });

  describe("build", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "build",
        arguments: { path: INVALID_PATH },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.errors).toEqual(expect.any(Number));
        expect(sc.warnings).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });

  describe("test", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "test",
        arguments: { path: INVALID_PATH },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.passed).toEqual(expect.any(Number));
        expect(sc.failed).toEqual(expect.any(Number));
        expect(sc.ignored).toEqual(expect.any(Number));
        expect(Array.isArray(sc.tests)).toBe(true);
      }
    });
  });

  describe("check", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "check",
        arguments: { path: INVALID_PATH },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.total).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });

  describe("run", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "run",
        arguments: { path: INVALID_PATH },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.exitCode).toEqual(expect.any(Number));
        expect(typeof sc.stdout).toBe("string");
        expect(typeof sc.stderr).toBe("string");
      }
    });
  });

  describe("add", () => {
    it("rejects flag injection in package names", async () => {
      const result = await client.callTool({
        name: "add",
        arguments: { packages: ["--git=https://evil.com"], path: INVALID_PATH },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/must not start with "-"/);
    });
  });

  describe("remove", () => {
    it("rejects flag injection in package names", async () => {
      const result = await client.callTool({
        name: "remove",
        arguments: { packages: ["--path=/etc/passwd"], path: INVALID_PATH },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/must not start with "-"/);
    });
  });

  describe("fmt", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "fmt",
        arguments: { path: INVALID_PATH, check: true },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.filesChanged).toEqual(expect.any(Number));
        expect(Array.isArray(sc.files)).toBe(true);
      }
    });
  });

  describe("doc", () => {
    it("returns structured output or error for an invalid path", async () => {
      const result = await client.callTool({
        name: "doc",
        arguments: { path: INVALID_PATH },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toBeDefined();
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.warnings).toEqual(expect.any(Number));
      }
    });
  });
});
