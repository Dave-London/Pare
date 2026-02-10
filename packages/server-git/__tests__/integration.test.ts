import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/git integration", () => {
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

  it("lists all 10 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "add",
      "branch",
      "checkout",
      "commit",
      "diff",
      "log",
      "pull",
      "push",
      "show",
      "status",
    ]);
  });

  describe("status", () => {
    it("returns structured status data", async () => {
      const result = await client.callTool({ name: "status", arguments: {} });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.branch).toEqual(expect.any(String));
      expect(Array.isArray(sc.staged)).toBe(true);
      expect(Array.isArray(sc.modified)).toBe(true);
      expect(Array.isArray(sc.untracked)).toBe(true);
      expect(Array.isArray(sc.conflicts)).toBe(true);
      expect(typeof sc.clean).toBe("boolean");
    });
  });

  describe("log", () => {
    it("returns structured commit history", async () => {
      const result = await client.callTool({
        name: "log",
        arguments: { maxCount: 3 },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.commits)).toBe(true);
      expect(sc.total).toEqual(expect.any(Number));

      const commits = sc.commits as Record<string, unknown>[];
      expect(commits.length).toBeGreaterThan(0);
      expect(commits.length).toBeLessThanOrEqual(3);

      const first = commits[0];
      expect(first.hash).toEqual(expect.any(String));
      expect(first.hashShort).toEqual(expect.any(String));
      expect(first.author).toEqual(expect.any(String));
      expect(first.email).toEqual(expect.any(String));
      expect(first.date).toEqual(expect.any(String));
      expect(first.message).toEqual(expect.any(String));
    });
  });

  describe("diff", () => {
    it("returns structured diff statistics", async () => {
      const result = await client.callTool({ name: "diff", arguments: {} });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.files)).toBe(true);
      expect(sc.totalAdditions).toEqual(expect.any(Number));
      expect(sc.totalDeletions).toEqual(expect.any(Number));
      expect(sc.totalFiles).toEqual(expect.any(Number));
    });
  });

  describe("branch", () => {
    it("returns structured branch list with current", async () => {
      const result = await client.callTool({ name: "branch", arguments: {} });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.current).toEqual(expect.any(String));
      expect(Array.isArray(sc.branches)).toBe(true);

      const branches = sc.branches as Record<string, unknown>[];
      expect(branches.length).toBeGreaterThan(0);
      const current = branches.find((b) => b.current === true);
      expect(current).toBeDefined();
      expect(current!.name).toBe(sc.current);
    });
  });

  describe("show", () => {
    it("returns structured commit details with diff", async () => {
      const result = await client.callTool({
        name: "show",
        arguments: { ref: "HEAD" },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      expect(sc.author).toEqual(expect.any(String));
      expect(sc.email).toEqual(expect.any(String));
      expect(sc.date).toEqual(expect.any(String));
      expect(sc.message).toEqual(expect.any(String));

      const diff = sc.diff as Record<string, unknown>;
      expect(diff).toBeDefined();
      expect(Array.isArray(diff.files)).toBe(true);
      expect(diff.totalAdditions).toEqual(expect.any(Number));
      expect(diff.totalDeletions).toEqual(expect.any(Number));
    });
  });
});

/**
 * Integration tests for write tools (add, commit, checkout, push, pull).
 *
 * These use a temporary git repo so they can safely perform write operations
 * without modifying the real repo. A separate MCP server is spawned with
 * PATH pointing at the temp repo.
 */
describe("@paretools/git write-tool integration", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let tempDir: string;

  function gitInTemp(args: string[]) {
    return execFileSync("git", args, {
      cwd: tempDir,
      encoding: "utf-8",
    });
  }

  beforeAll(async () => {
    // Create a temp repo
    tempDir = mkdtempSync(join(tmpdir(), "pare-git-integration-"));
    gitInTemp(["init"]);
    gitInTemp(["config", "user.email", "test@pare.dev"]);
    gitInTemp(["config", "user.name", "Pare Integration Test"]);
    writeFileSync(join(tempDir, "initial.txt"), "hello\n");
    gitInTemp(["add", "."]);
    gitInTemp(["commit", "-m", "Initial commit"]);

    // Spawn the MCP server
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client-write", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("add", () => {
    it("stages files and returns structured add data", async () => {
      // Create a file to add
      writeFileSync(join(tempDir, "new-file.ts"), "export {};\n");

      const result = await client.callTool({
        name: "add",
        arguments: { path: tempDir, files: ["new-file.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.staged).toEqual(expect.any(Number));
      expect(Array.isArray(sc.files)).toBe(true);
      expect((sc.staged as number)).toBeGreaterThanOrEqual(1);
    });

    it("stages all files with all=true", async () => {
      writeFileSync(join(tempDir, "another.ts"), "export const x = 1;\n");

      const result = await client.callTool({
        name: "add",
        arguments: { path: tempDir, all: true },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect((sc.staged as number)).toBeGreaterThanOrEqual(1);
    });

    it("rejects flag-injection in file paths", async () => {
      const result = await client.callTool({
        name: "add",
        arguments: { path: tempDir, files: ["--force"] },
      });

      // Should return an error
      expect(result.isError).toBe(true);
    });
  });

  describe("commit", () => {
    it("creates a commit and returns structured commit data", async () => {
      // Ensure there's something to commit
      writeFileSync(join(tempDir, "commit-test.ts"), "export const y = 2;\n");
      gitInTemp(["add", "commit-test.ts"]);

      // Use a single-word message because execFile with shell:true on Windows
      // does not properly escape multi-word arguments for git commit -m
      const result = await client.callTool({
        name: "commit",
        arguments: { path: tempDir, message: "TestCommit" },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      expect(sc.hashShort).toEqual(expect.any(String));
      expect(sc.message).toBe("TestCommit");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      expect(sc.insertions).toEqual(expect.any(Number));
      expect(sc.deletions).toEqual(expect.any(Number));
    });

    it("rejects flag-injection in commit message", async () => {
      const result = await client.callTool({
        name: "commit",
        arguments: { path: tempDir, message: "--amend" },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("checkout", () => {
    it("creates a new branch and returns structured checkout data", async () => {
      const result = await client.callTool({
        name: "checkout",
        arguments: { path: tempDir, ref: "test-branch-integration", create: true },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.ref).toBe("test-branch-integration");
      expect(sc.created).toBe(true);
      expect(sc.previousRef).toEqual(expect.any(String));
    });

    it("switches back to an existing branch", async () => {
      // Get the default branch name
      const defaultBranch = gitInTemp(["branch"]).trim().split("\n")
        .find((l) => !l.startsWith("*"))?.trim();

      if (defaultBranch) {
        const result = await client.callTool({
          name: "checkout",
          arguments: { path: tempDir, ref: defaultBranch },
        });

        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.ref).toBe(defaultBranch);
        expect(sc.created).toBe(false);
      }
    });

    it("rejects flag-injection in ref", async () => {
      const result = await client.callTool({
        name: "checkout",
        arguments: { path: tempDir, ref: "--force" },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("push", () => {
    it("rejects flag-injection in remote name", async () => {
      const result = await client.callTool({
        name: "push",
        arguments: { path: tempDir, remote: "--delete" },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects flag-injection in branch name", async () => {
      const result = await client.callTool({
        name: "push",
        arguments: { path: tempDir, branch: "--force" },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("pull", () => {
    it("rejects flag-injection in remote name", async () => {
      const result = await client.callTool({
        name: "pull",
        arguments: { path: tempDir, remote: "--exec=malicious" },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects flag-injection in branch name", async () => {
      const result = await client.callTool({
        name: "pull",
        arguments: { path: tempDir, branch: "--no-verify" },
      });

      expect(result.isError).toBe(true);
    });
  });
});
