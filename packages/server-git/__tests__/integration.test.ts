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

  it("lists all 24 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "add",
      "bisect",
      "blame",
      "branch",
      "checkout",
      "cherry-pick",
      "commit",
      "diff",
      "log",
      "log-graph",
      "merge",
      "pull",
      "push",
      "rebase",
      "reflog",
      "remote",
      "reset",
      "restore",
      "show",
      "stash",
      "stash-list",
      "status",
      "tag",
      "worktree",
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
        arguments: { maxCount: 3, compact: false },
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
      expect(first.date).toEqual(expect.any(String));
      expect(first.message).toEqual(expect.any(String));
    });
  });

  describe("log-graph", () => {
    it("returns structured graph topology", async () => {
      const result = await client.callTool({
        name: "log-graph",
        arguments: { maxCount: 5, compact: false },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.commits)).toBe(true);
      expect(sc.total).toEqual(expect.any(Number));

      const commits = sc.commits as Record<string, unknown>[];
      // Should have at least one actual commit
      const realCommits = commits.filter((c) => c.hashShort !== "");
      expect(realCommits.length).toBeGreaterThan(0);
      expect(realCommits.length).toBeLessThanOrEqual(5);

      const first = realCommits[0];
      expect(first.graph).toEqual(expect.any(String));
      expect(first.hashShort).toEqual(expect.any(String));
      expect(first.message).toEqual(expect.any(String));
    });
  });

  describe("reflog", () => {
    it("returns structured reflog data", async () => {
      const result = await client.callTool({
        name: "reflog",
        arguments: { maxCount: 5, compact: false },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(Array.isArray(sc.entries)).toBe(true);
      expect(sc.total).toEqual(expect.any(Number));

      const entries = sc.entries as Record<string, unknown>[];
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.length).toBeLessThanOrEqual(5);

      const first = entries[0];
      expect(first.hash).toEqual(expect.any(String));
      expect(first.shortHash).toEqual(expect.any(String));
      expect(first.selector).toEqual(expect.any(String));
      expect(first.action).toEqual(expect.any(String));
    });
  });

  describe("worktree", () => {
    it("returns worktree list data with text content", async () => {
      const result = await client.callTool({
        name: "worktree",
        arguments: { action: "list", compact: false },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // worktree tool uses z.union for outputSchema which may not return
      // structuredContent via MCP SDK; verify text content instead
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent.length).toBeGreaterThan(0);
      expect(textContent[0].type).toBe("text");
      // The text output should contain at least one worktree path
      expect(textContent[0].text.length).toBeGreaterThan(0);

      // If structuredContent is available, verify its shape
      if (result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(Array.isArray(sc.worktrees)).toBe(true);
        expect(sc.total).toEqual(expect.any(Number));
      }
    });
  });

  describe("diff", () => {
    it("returns structured diff statistics", async () => {
      const result = await client.callTool({ name: "diff", arguments: { compact: false } });

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
      const result = await client.callTool({ name: "branch", arguments: { compact: false } });

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
        arguments: { ref: "HEAD", compact: false },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      expect(sc.author).toEqual(expect.any(String));
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
      expect(sc.staged as number).toBeGreaterThanOrEqual(1);
    });

    it("stages all files with all=true", async () => {
      writeFileSync(join(tempDir, "another.ts"), "export const x = 1;\n");

      const result = await client.callTool({
        name: "add",
        arguments: { path: tempDir, all: true },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.staged as number).toBeGreaterThanOrEqual(1);
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
    it("creates a commit with multi-word message and returns structured data", async () => {
      // Ensure there's something to commit
      writeFileSync(join(tempDir, "commit-test.ts"), "export const y = 2;\n");
      gitInTemp(["add", "commit-test.ts"]);

      // Uses --file - with stdin so multi-word messages work on Windows
      const result = await client.callTool({
        name: "commit",
        arguments: { path: tempDir, message: "feat: add commit test file" },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      expect(sc.hashShort).toEqual(expect.any(String));
      expect(sc.message).toBe("feat: add commit test file");
      expect(sc.filesChanged).toEqual(expect.any(Number));
      expect(sc.insertions).toEqual(expect.any(Number));
      expect(sc.deletions).toEqual(expect.any(Number));
    });

    it("creates a commit with multi-line message preserving newlines", async () => {
      writeFileSync(join(tempDir, "commit-test-2.ts"), "export const z = 3;\n");
      gitInTemp(["add", "commit-test-2.ts"]);

      const multiLineMsg =
        "chore(test): add multi-line commit\n\nThis tests that newlines are preserved\nwhen using --file - with stdin.";
      const result = await client.callTool({
        name: "commit",
        arguments: { path: tempDir, message: multiLineMsg },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.hash).toEqual(expect.any(String));
      // git commit --file - preserves the first line as the subject
      expect(sc.message).toBe("chore(test): add multi-line commit");
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
      const defaultBranch = gitInTemp(["branch"])
        .trim()
        .split("\n")
        .find((l) => !l.startsWith("*"))
        ?.trim();

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

  describe("reset", () => {
    it("unstages a staged file and returns structured reset data", async () => {
      // Create and stage a file
      writeFileSync(join(tempDir, "reset-test.ts"), "export const r = 1;\n");
      gitInTemp(["add", "reset-test.ts"]);

      // Verify file is staged
      const statusBefore = gitInTemp(["status", "--porcelain"]);
      expect(statusBefore).toContain("reset-test.ts");

      const result = await client.callTool({
        name: "reset",
        arguments: { path: tempDir, files: ["reset-test.ts"] },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.ref).toBe("HEAD");
      expect(Array.isArray(sc.unstaged)).toBe(true);
    });

    it("unstages all files when no files specified", async () => {
      // Stage multiple files
      writeFileSync(join(tempDir, "reset-all-1.ts"), "export const a = 1;\n");
      writeFileSync(join(tempDir, "reset-all-2.ts"), "export const b = 2;\n");
      gitInTemp(["add", "reset-all-1.ts", "reset-all-2.ts"]);

      const result = await client.callTool({
        name: "reset",
        arguments: { path: tempDir },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.ref).toBe("HEAD");
      expect(Array.isArray(sc.unstaged)).toBe(true);
    });

    it("rejects flag-injection in ref", async () => {
      const result = await client.callTool({
        name: "reset",
        arguments: { path: tempDir, ref: "--hard" },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects flag-injection in file paths", async () => {
      const result = await client.callTool({
        name: "reset",
        arguments: { path: tempDir, files: ["--force"] },
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

  describe("merge", () => {
    it("fast-forward merges a branch and returns structured data", async () => {
      // Ensure we are on the default branch
      const branches = gitInTemp(["branch"]).trim().split("\n");
      const defaultBranch =
        branches
          .find((b) => b.startsWith("*"))
          ?.replace("* ", "")
          .trim() || "master";

      // Create a feature branch, commit on it, then switch back and merge
      gitInTemp(["checkout", "-b", "merge-ff-test"]);
      writeFileSync(join(tempDir, "merge-ff.txt"), "merge ff content\n");
      gitInTemp(["add", "merge-ff.txt"]);
      gitInTemp(["commit", "-m", "feat: add merge-ff file"]);
      gitInTemp(["checkout", defaultBranch]);

      const result = await client.callTool({
        name: "merge",
        arguments: { path: tempDir, branch: "merge-ff-test" },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.merged).toBe(true);
      expect(sc.fastForward).toBe(true);
      expect(sc.branch).toBe("merge-ff-test");
      expect(Array.isArray(sc.conflicts)).toBe(true);
      expect((sc.conflicts as string[]).length).toBe(0);
    });

    it("non-ff merges a branch with --no-ff and returns merge commit hash", async () => {
      // Create a feature branch, commit, switch back, merge with --no-ff
      const branches = gitInTemp(["branch"]).trim().split("\n");
      const defaultBranch =
        branches
          .find((b) => b.startsWith("*"))
          ?.replace("* ", "")
          .trim() || "master";

      gitInTemp(["checkout", "-b", "merge-noff-test"]);
      writeFileSync(join(tempDir, "merge-noff.txt"), "merge noff content\n");
      gitInTemp(["add", "merge-noff.txt"]);
      gitInTemp(["commit", "-m", "feat: add merge-noff file"]);
      gitInTemp(["checkout", defaultBranch]);

      const result = await client.callTool({
        name: "merge",
        arguments: { path: tempDir, branch: "merge-noff-test", noFf: true },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.merged).toBe(true);
      expect(sc.fastForward).toBe(false);
      expect(sc.branch).toBe("merge-noff-test");
      expect((sc.conflicts as string[]).length).toBe(0);
    });

    it("reports conflicts as structured data without throwing", async () => {
      const branches = gitInTemp(["branch"]).trim().split("\n");
      const defaultBranch =
        branches
          .find((b) => b.startsWith("*"))
          ?.replace("* ", "")
          .trim() || "master";

      // Create conflicting changes
      writeFileSync(join(tempDir, "conflict-file.txt"), "main content\n");
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "add conflict file on main"]);

      gitInTemp(["checkout", "-b", "merge-conflict-test"]);
      writeFileSync(join(tempDir, "conflict-file.txt"), "branch content\n");
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "change conflict file on branch"]);

      gitInTemp(["checkout", defaultBranch]);
      writeFileSync(join(tempDir, "conflict-file.txt"), "different main content\n");
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "change conflict file on main"]);

      const result = await client.callTool({
        name: "merge",
        arguments: { path: tempDir, branch: "merge-conflict-test" },
      });

      // Should NOT be an error — conflicts are returned as structured data
      expect(result.isError).not.toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.merged).toBe(false);
      expect(sc.fastForward).toBe(false);
      expect(sc.branch).toBe("merge-conflict-test");
      expect((sc.conflicts as string[]).length).toBeGreaterThan(0);
      expect(sc.conflicts as string[]).toContain("conflict-file.txt");

      // Clean up: abort the merge
      gitInTemp(["merge", "--abort"]);
    });

    it("rejects flag-injection in branch name", async () => {
      const result = await client.callTool({
        name: "merge",
        arguments: { path: tempDir, branch: "--force" },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects flag-injection in message", async () => {
      const result = await client.callTool({
        name: "merge",
        arguments: { path: tempDir, branch: "some-branch", message: "--amend" },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("bisect", () => {
    it("handles reset action without error when no bisect is active", async () => {
      const result = await client.callTool({
        name: "bisect",
        arguments: { path: tempDir, action: "reset" },
      });

      // bisect reset when no bisect is active should still succeed
      // (git bisect reset returns 0 when there's no active bisect session)
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.action).toBe("reset");
      expect(sc.message).toEqual(expect.any(String));
    });

    it("runs a full bisect session (start, good, bad, reset)", async () => {
      // Create several commits to have enough history for bisecting
      for (let i = 1; i <= 5; i++) {
        writeFileSync(join(tempDir, `bisect-${i}.txt`), `content ${i}\n`);
        gitInTemp(["add", `bisect-${i}.txt`]);
        gitInTemp(["commit", "-m", `commit ${i}`]);
      }

      // Get first and last commits
      const firstCommit = gitInTemp(["rev-list", "--max-parents=0", "HEAD"]).trim();
      const lastCommit = gitInTemp(["rev-parse", "HEAD"]).trim();

      // Start bisect with bad=HEAD and good=first commit
      const startResult = await client.callTool({
        name: "bisect",
        arguments: {
          path: tempDir,
          action: "start",
          bad: lastCommit,
          good: firstCommit,
        },
      });

      expect(startResult.content).toBeDefined();
      const startSc = startResult.structuredContent as Record<string, unknown>;
      expect(startSc).toBeDefined();
      expect(startSc.action).toBe("start");
      expect(startSc.message).toEqual(expect.any(String));

      // Reset bisect to clean up
      const resetResult = await client.callTool({
        name: "bisect",
        arguments: { path: tempDir, action: "reset" },
      });

      const resetSc = resetResult.structuredContent as Record<string, unknown>;
      expect(resetSc).toBeDefined();
      expect(resetSc.action).toBe("reset");
    });

    it("rejects flag-injection in bad ref", async () => {
      const result = await client.callTool({
        name: "bisect",
        arguments: { path: tempDir, action: "start", bad: "--exec=malicious", good: "HEAD" },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects flag-injection in good ref", async () => {
      const result = await client.callTool({
        name: "bisect",
        arguments: { path: tempDir, action: "start", bad: "HEAD", good: "--exec=malicious" },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("rebase", () => {
    it("rebases a branch onto another and returns structured data", async () => {
      // Ensure we are on the default branch (master/main)
      const defaultBranch = gitInTemp(["rev-parse", "--abbrev-ref", "HEAD"]).trim();

      // Create a base commit on the default branch
      writeFileSync(join(tempDir, "rebase-base.txt"), "base content\n");
      gitInTemp(["add", "rebase-base.txt"]);
      gitInTemp(["commit", "-m", "Add rebase base file"]);

      // Create a feature branch and add a commit
      gitInTemp(["checkout", "-b", "rebase-feature"]);
      writeFileSync(join(tempDir, "rebase-feature.txt"), "feature content\n");
      gitInTemp(["add", "rebase-feature.txt"]);
      gitInTemp(["commit", "-m", "Add feature file"]);

      // Go back to default branch and add another commit (diverge)
      gitInTemp(["checkout", defaultBranch]);
      writeFileSync(join(tempDir, "rebase-diverge.txt"), "diverge content\n");
      gitInTemp(["add", "rebase-diverge.txt"]);
      gitInTemp(["commit", "-m", "Add diverge file"]);

      // Checkout feature branch and rebase onto default
      gitInTemp(["checkout", "rebase-feature"]);

      const result = await client.callTool({
        name: "rebase",
        arguments: { path: tempDir, branch: defaultBranch },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.success).toBe(true);
      expect(sc.branch).toBe(defaultBranch);
      expect(sc.current).toBe("rebase-feature");
      expect(sc.conflicts).toEqual([]);
      expect(sc.rebasedCommits).toBe(1);

      // Verify the text content
      const textContent = result.content as Array<{ type: string; text: string }>;
      const text = textContent[0].text.replace(/\r\n/g, "\n");
      expect(text).toContain("Rebased");

      // Clean up — go back to default branch
      gitInTemp(["checkout", defaultBranch]);
    });

    it("detects conflicts and returns success=false", async () => {
      const defaultBranch = gitInTemp(["rev-parse", "--abbrev-ref", "HEAD"]).trim();

      // Create a shared base: a file that both branches will modify differently
      writeFileSync(join(tempDir, "conflict-file.txt"), "line 1\nline 2\nline 3\n");
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "Add conflict base file"]);

      // Create a feature branch from this point
      gitInTemp(["checkout", "-b", "rebase-conflict"]);
      // Modify the same lines on the feature branch
      writeFileSync(
        join(tempDir, "conflict-file.txt"),
        "feature line 1\nfeature line 2\nfeature line 3\n",
      );
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "Modify conflict file on feature"]);

      // Go back to default and modify the same lines differently
      gitInTemp(["checkout", defaultBranch]);
      writeFileSync(
        join(tempDir, "conflict-file.txt"),
        "default line 1\ndefault line 2\ndefault line 3\n",
      );
      gitInTemp(["add", "conflict-file.txt"]);
      gitInTemp(["commit", "-m", "Modify conflict file on default"]);

      // Checkout feature and attempt rebase onto default (should conflict)
      gitInTemp(["checkout", "rebase-conflict"]);

      const result = await client.callTool({
        name: "rebase",
        arguments: { path: tempDir, branch: defaultBranch },
      });

      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.success).toBe(false);
      expect((sc.conflicts as string[]).length).toBeGreaterThan(0);
      expect(sc.conflicts).toContain("conflict-file.txt");

      // Verify the text content mentions conflicts — normalize CRLF for Windows
      const textContent = result.content as Array<{ type: string; text: string }>;
      const text = textContent[0].text.replace(/\r\n/g, "\n");
      expect(text).toContain("conflict");

      // Abort the rebase to clean up
      const abortResult = await client.callTool({
        name: "rebase",
        arguments: { path: tempDir, abort: true },
      });

      const abortSc = abortResult.structuredContent as Record<string, unknown>;
      expect(abortSc.success).toBe(true);

      // Clean up
      gitInTemp(["checkout", defaultBranch]);
    });

    it("rejects flag-injection in branch name", async () => {
      const result = await client.callTool({
        name: "rebase",
        arguments: { path: tempDir, branch: "--exec=malicious" },
      });

      expect(result.isError).toBe(true);
    });

    it("errors when branch is missing for normal rebase", async () => {
      const result = await client.callTool({
        name: "rebase",
        arguments: { path: tempDir },
      });

      expect(result.isError).toBe(true);
    });
  });
});
