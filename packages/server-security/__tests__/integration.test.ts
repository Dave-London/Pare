import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/security integration", () => {
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

  it("lists all 3 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["gitleaks", "semgrep", "trivy"]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("trivy", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "trivy",
        arguments: { target: "alpine:3.18" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/trivy|command|not found|ENOENT|failed/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.totalVulnerabilities).toBe("number");
        expect(sc.target).toBe("alpine:3.18");
      }
    });
  });

  describe("semgrep", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "semgrep",
        arguments: { config: "auto" },
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/semgrep|command|not found|ENOENT|failed/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.totalFindings).toBe("number");
      }
    });
  });

  describe("gitleaks", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool({
        name: "gitleaks",
        arguments: {},
      });

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gitleaks|command|not found|ENOENT|failed/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.totalFindings).toBe("number");
      }
    });
  });
});
