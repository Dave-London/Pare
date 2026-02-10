import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/build integration", () => {
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

  it("lists all 5 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["build", "esbuild", "tsc", "vite-build", "webpack"]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("tsc", () => {
    it("returns structured TypeScript diagnostics", async () => {
      const repoRoot = resolve(__dirname, "../../..");
      const result = await client.callTool({
        name: "tsc",
        arguments: { path: repoRoot, noEmit: true },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(Array.isArray(sc.diagnostics)).toBe(true);
      expect(sc.total).toEqual(expect.any(Number));
      expect(sc.errors).toEqual(expect.any(Number));
      expect(sc.warnings).toEqual(expect.any(Number));
    }, 60_000);
  });

  describe("build", () => {
    it("returns structured build result", async () => {
      // Use a known-safe command that will fail fast (no actual build needed)
      const result = await client.callTool({
        name: "build",
        arguments: { command: "npm", args: ["--version"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(typeof sc.success).toBe("boolean");
      expect(typeof sc.duration).toBe("number");
      expect(Array.isArray(sc.errors)).toBe(true);
      expect(Array.isArray(sc.warnings)).toBe(true);
    }, 30_000);

    it("rejects disallowed commands", async () => {
      const result = await client.callTool({
        name: "build",
        arguments: { command: "rm", args: ["-rf", "/"] },
      });

      // The tool should return an error (isError flag or error in content)
      expect(result.isError).toBe(true);
    }, 10_000);
  });

  describe("esbuild", () => {
    it("accepts input and returns content without crashing", async () => {
      // Call with a non-existent entry point; esbuild will fail but the tool
      // should return either structured output or an error — not crash
      const result = await client.callTool({
        name: "esbuild",
        arguments: {
          entryPoints: ["__nonexistent_entry__.ts"],
          outdir: "dist",
        },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // The tool may return structured output or an error depending on
      // whether esbuild is installed. Either is acceptable.
      if (result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.duration).toBe("number");
        expect(Array.isArray(sc.errors)).toBe(true);
        expect(Array.isArray(sc.warnings)).toBe(true);
      } else {
        // If no structured content, it should be marked as an error
        expect(result.isError).toBe(true);
      }
    }, 60_000);

    it("rejects flag injection in entryPoints", async () => {
      const result = await client.callTool({
        name: "esbuild",
        arguments: {
          entryPoints: ["--outfile=/etc/passwd"],
          outdir: "dist",
        },
      });

      expect(result.isError).toBe(true);
    }, 10_000);
  });

  describe("vite-build", () => {
    it("accepts input and returns content without crashing", async () => {
      // vite build will fail without a proper project, but should not crash
      const result = await client.callTool({
        name: "vite-build",
        arguments: { path: resolve(__dirname, "..") },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      if (result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.duration).toBe("number");
        expect(Array.isArray(sc.outputs)).toBe(true);
        expect(Array.isArray(sc.errors)).toBe(true);
        expect(Array.isArray(sc.warnings)).toBe(true);
      } else {
        expect(result.isError).toBe(true);
      }
    }, 60_000);
  });

  describe("webpack", () => {
    it("accepts input and returns content or times out gracefully", async () => {
      // webpack may not be installed and npx install can take a long time,
      // so we accept both a result and a timeout as valid outcomes
      try {
        const result = await client.callTool({
          name: "webpack",
          arguments: { path: resolve(__dirname, "..") },
        });

        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);

        if (result.structuredContent) {
          const sc = result.structuredContent as Record<string, unknown>;
          expect(typeof sc.success).toBe("boolean");
          expect(typeof sc.duration).toBe("number");
          expect(Array.isArray(sc.assets)).toBe(true);
          expect(Array.isArray(sc.errors)).toBe(true);
          expect(Array.isArray(sc.warnings)).toBe(true);
        } else {
          expect(result.isError).toBe(true);
        }
      } catch (err: unknown) {
        // MCP SDK may throw a timeout error — that's acceptable
        const message = err instanceof Error ? err.message : String(err);
        expect(message).toMatch(/timed out/i);
      }
    }, 120_000);
  });
});
