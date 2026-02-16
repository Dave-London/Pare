import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 180_000;

describe("@paretools/go integration", () => {
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

  it("lists all 11 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "build",
      "env",
      "fmt",
      "generate",
      "get",
      "golangci-lint",
      "list",
      "mod-tidy",
      "run",
      "test",
      "vet",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("vet", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "vet", arguments: { path: resolve(__dirname, "../../..") } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });

  describe("build", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "build", arguments: { path: resolve(__dirname, "../../..") } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.total).toEqual(expect.any(Number));
        // errors is conditionally included (only when non-empty)
        if (sc.errors !== undefined) {
          expect(Array.isArray(sc.errors)).toBe(true);
        }
      }
    });
  });

  describe("test", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "test", arguments: { path: resolve(__dirname, "../../..") } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.passed).toEqual(expect.any(Number));
        expect(sc.failed).toEqual(expect.any(Number));
        expect(sc.skipped).toEqual(expect.any(Number));
        expect(Array.isArray(sc.tests)).toBe(true);
      }
    });
  });

  describe("run", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: { path: resolve(__dirname, "../../.."), file: ".", compact: false },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.exitCode).toBe("number");
        expect(typeof sc.stdout).toBe("string");
        expect(typeof sc.stderr).toBe("string");
      }
    });
  });

  describe("mod-tidy", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "mod-tidy", arguments: { path: resolve(__dirname, "../../.."), compact: false } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.summary).toBe("string");
      }
    });
  });

  describe("fmt", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        {
          name: "fmt",
          arguments: { path: resolve(__dirname, "../../.."), check: true, compact: false },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gofmt|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.filesChanged).toBe("number");
        expect(Array.isArray(sc.files)).toBe(true);
      }
    });
  });

  describe("generate", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "generate", arguments: { path: resolve(__dirname, "../../.."), compact: false } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.output).toBe("string");
      }
    });
  });

  describe("env", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "env", arguments: { compact: false } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.goroot).toBe("string");
        expect(typeof sc.gopath).toBe("string");
        expect(typeof sc.goversion).toBe("string");
        expect(typeof sc.goos).toBe("string");
        expect(typeof sc.goarch).toBe("string");
        expect(typeof sc.vars).toBe("object");
      }
    });
  });

  describe("list", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "list", arguments: { path: resolve(__dirname, "../../.."), compact: false } },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(Array.isArray(sc.packages)).toBe(true);
      }
    });
  });

  describe("get", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        {
          name: "get",
          arguments: {
            packages: ["github.com/pkg/errors@v0.9.1"],
            path: resolve(__dirname, "../../.."),
            compact: false,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/go|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
      }
    });
  });

  describe("golangci-lint", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        {
          name: "golangci-lint",
          arguments: { path: resolve(__dirname, "../../.."), compact: false },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/golangci-lint|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.errors).toEqual(expect.any(Number));
        expect(sc.warnings).toEqual(expect.any(Number));
      }
    });
  });
});
