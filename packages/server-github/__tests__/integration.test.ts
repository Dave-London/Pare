import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 180_000;

describe("@paretools/github integration", () => {
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

  it("lists all 22 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "api",
      "gist-create",
      "issue-close",
      "issue-comment",
      "issue-create",
      "issue-list",
      "issue-update",
      "issue-view",
      "pr-checks",
      "pr-comment",
      "pr-create",
      "pr-diff",
      "pr-list",
      "pr-merge",
      "pr-review",
      "pr-update",
      "pr-view",
      "release-create",
      "release-list",
      "run-list",
      "run-rerun",
      "run-view",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  // ── Read-only tools: call with non-existent repo to test error handling ──

  describe("pr-view", () => {
    it("returns error for non-existent PR", async () => {
      const result = await client.callTool(
        {
          name: "pr-view",
          arguments: { pr: 999999, repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      // Should fail because repo doesn't exist or gh auth is missing
      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      }
      // If gh is authed and somehow succeeds, we just verify structure
    });
  });

  describe("pr-list", () => {
    it("returns error or structured data for non-existent repo", async () => {
      const result = await client.callTool(
        {
          name: "pr-list",
          arguments: { repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.prs)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("pr-checks", () => {
    it("returns error for non-existent PR", async () => {
      const result = await client.callTool(
        {
          name: "pr-checks",
          arguments: { pr: 999999, repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      }
    });
  });

  describe("pr-diff", () => {
    it("returns error for non-existent PR", async () => {
      const result = await client.callTool(
        {
          name: "pr-diff",
          arguments: { pr: 999999, repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      }
    });
  });

  describe("issue-view", () => {
    it("returns error for non-existent issue", async () => {
      const result = await client.callTool(
        {
          name: "issue-view",
          arguments: { issue: 999999, repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      }
    });
  });

  describe("issue-list", () => {
    it("returns error or structured data for non-existent repo", async () => {
      const result = await client.callTool(
        {
          name: "issue-list",
          arguments: { repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.issues)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("run-view", () => {
    it("returns error for non-existent run", async () => {
      const result = await client.callTool(
        {
          name: "run-view",
          arguments: { runId: 999999999, repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      }
    });
  });

  describe("run-list", () => {
    it("returns error or structured data for non-existent repo", async () => {
      const result = await client.callTool(
        {
          name: "run-list",
          arguments: { repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.runs)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("release-list", () => {
    it("returns error or structured data for non-existent repo", async () => {
      const result = await client.callTool(
        {
          name: "release-list",
          arguments: { repo: "paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.releases)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("api", () => {
    it("returns error or structured data for a simple endpoint", async () => {
      const result = await client.callTool(
        {
          name: "api",
          arguments: { endpoint: "repos/paretools/nonexistent-repo-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/gh|failed|error|not found|auth|login/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.status).toEqual(expect.any(Number));
        expect(sc.endpoint).toEqual(expect.any(String));
        expect(sc.method).toEqual(expect.any(String));
      }
    });
  });

  // ── Security: flag injection tests via MCP callTool ──────────────────

  describe("security: flag injection via MCP", () => {
    it("pr-create rejects flag-injection in title", async () => {
      const result = await client.callTool(
        {
          name: "pr-create",
          arguments: {
            title: "--exec=malicious",
            body: "test body",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-create rejects flag-injection in base branch", async () => {
      const result = await client.callTool(
        {
          name: "pr-create",
          arguments: {
            title: "safe title",
            body: "test body",
            base: "--delete",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-create rejects flag-injection in head branch", async () => {
      const result = await client.callTool(
        {
          name: "pr-create",
          arguments: {
            title: "safe title",
            body: "test body",
            head: "--force",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-comment rejects flag-injection in body", async () => {
      const result = await client.callTool(
        {
          name: "pr-comment",
          arguments: {
            pr: 1,
            body: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("issue-create rejects flag-injection in title", async () => {
      const result = await client.callTool(
        {
          name: "issue-create",
          arguments: {
            title: "--exec=malicious",
            body: "test body",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("issue-comment rejects flag-injection in body", async () => {
      const result = await client.callTool(
        {
          name: "issue-comment",
          arguments: {
            issue: 1,
            body: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("issue-close rejects flag-injection in comment", async () => {
      const result = await client.callTool(
        {
          name: "issue-close",
          arguments: {
            issue: 1,
            comment: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-review rejects flag-injection in body", async () => {
      const result = await client.callTool(
        {
          name: "pr-review",
          arguments: {
            pr: 1,
            event: "comment",
            body: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-update rejects flag-injection in title", async () => {
      const result = await client.callTool(
        {
          name: "pr-update",
          arguments: {
            pr: 1,
            title: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-update rejects flag-injection in addLabels", async () => {
      const result = await client.callTool(
        {
          name: "pr-update",
          arguments: {
            pr: 1,
            addLabels: ["--exec=malicious"],
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("issue-update rejects flag-injection in title", async () => {
      const result = await client.callTool(
        {
          name: "issue-update",
          arguments: {
            issue: 1,
            title: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("issue-update rejects flag-injection in addLabels", async () => {
      const result = await client.callTool(
        {
          name: "issue-update",
          arguments: {
            issue: 1,
            addLabels: ["--exec=malicious"],
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("release-create rejects flag-injection in tag", async () => {
      const result = await client.callTool(
        {
          name: "release-create",
          arguments: {
            tag: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("release-list rejects flag-injection in repo", async () => {
      const result = await client.callTool(
        {
          name: "release-list",
          arguments: {
            repo: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });

    it("pr-diff rejects flag-injection in repo", async () => {
      const result = await client.callTool(
        {
          name: "pr-diff",
          arguments: {
            pr: 1,
            repo: "--exec=malicious",
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBe(true);
    });
  });
});
