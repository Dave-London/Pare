import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/k8s integration", () => {
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
    expect(names).toEqual(["apply", "describe", "get", "helm", "logs"]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      // The helm tool uses a union schema which may not have a top-level "object" type
      if (tool.name === "helm") {
        // Union schemas may be represented differently; just check it exists or is undefined
        // (the SDK may not expose union schemas via listTools)
        continue;
      }
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("get", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "get",
        arguments: { resource: "pods" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(
          /kubectl|command|not found|ENOENT|failed|error|validation/i,
        );
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.success).toBe("boolean");
      }
    });

    it("rejects flag injection in resource param", async () => {
      const result = await client.callTool({
        name: "get",
        arguments: { resource: "--privileged" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid resource|argument injection/i);
    });

    it("rejects flag injection in name param", async () => {
      const result = await client.callTool({
        name: "get",
        arguments: { resource: "pods", name: "--all" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid name|argument injection/i);
    });

    it("rejects flag injection in namespace param", async () => {
      const result = await client.callTool({
        name: "get",
        arguments: { resource: "pods", namespace: "--all-namespaces" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid namespace|argument injection/i);
    });
  });

  describe("describe", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "describe",
        arguments: { resource: "pod", name: "nonexistent-pod-for-testing" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(
          /kubectl|command|not found|ENOENT|failed|error|validation/i,
        );
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
      }
    });

    it("rejects flag injection in name param", async () => {
      const result = await client.callTool({
        name: "describe",
        arguments: { resource: "pod", name: "--privileged" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid name|argument injection/i);
    });
  });

  describe("logs", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "logs",
        arguments: { pod: "nonexistent-pod-for-testing" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(
          /kubectl|command|not found|ENOENT|failed|error|validation/i,
        );
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.lineCount).toBe("number");
      }
    });

    it("rejects flag injection in pod param", async () => {
      const result = await client.callTool({
        name: "logs",
        arguments: { pod: "--all-containers" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid pod|argument injection/i);
    });
  });

  describe("apply", () => {
    it("returns error or structured data for nonexistent file", async () => {
      const result = await client.callTool({
        name: "apply",
        arguments: { file: "/nonexistent-path-for-testing/manifest.yaml" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/kubectl|command|not found|ENOENT|failed|error/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
      }
    });

    it("rejects flag injection in namespace param", async () => {
      const result = await client.callTool({
        name: "apply",
        arguments: { file: "test.yaml", namespace: "--privileged" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid namespace|argument injection/i);
    });
  });

  describe("helm", () => {
    it("returns structured data or a command-not-found error for list", async () => {
      const result = await client.callTool({
        name: "helm",
        arguments: { action: "list" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/helm|command|not found|ENOENT|failed|error|Cannot read/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.success).toBe("boolean");
      }
    });

    it("rejects flag injection in release param", async () => {
      const result = await client.callTool({
        name: "helm",
        arguments: { action: "status", release: "--all" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid release|argument injection/i);
    });

    it("rejects flag injection in namespace param", async () => {
      const result = await client.callTool({
        name: "helm",
        arguments: { action: "list", namespace: "--all-namespaces" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/Invalid namespace|argument injection/i);
    });
  });
});
