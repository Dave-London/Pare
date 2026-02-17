/**
 * Smoke tests: git.status — Phase 3 (recorded)
 *
 * Feeds REAL `git status` output captured from actual git repos through
 * the tool handler. Validates that the parser, formatter, and schema
 * chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { GitStatusSchema } from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerStatusTool } from "../../../packages/server-git/src/tools/status.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const FIXTURE_DIR = resolve(__dirname, "../fixtures/git/status");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

function mockGitWithFixture(name: string, stderr = "", exitCode = 0) {
  vi.mocked(git).mockResolvedValueOnce({
    stdout: loadFixture(name),
    stderr,
    exitCode,
  });
}

describe("Recorded: git.status", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStatusTool(server as never);
    handler = server.tools.get("status")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStatusSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Happy path / core functionality (S1–S10)
  // ═══════════════════════════════════════════════════════════════════

  it("S1 [recorded] clean repo", async () => {
    mockGitWithFixture("s01-clean.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.clean).toBe(true);
    expect(parsed.staged).toEqual([]);
    expect(parsed.modified).toEqual([]);
    expect(parsed.untracked).toEqual([]);
    expect(parsed.branch).toBe("main");
  });

  it("S2 [recorded] staged added file", async () => {
    mockGitWithFixture("s02-staged-added.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("added");
    expect(parsed.staged[0].file).toBe("new-file.ts");
    expect(parsed.clean).toBe(false);
  });

  it("S3 [recorded] staged modified file", async () => {
    mockGitWithFixture("s03-staged-modified.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("modified");
    expect(parsed.staged[0].file).toBe("src-index.ts");
  });

  it("S4 [recorded] staged deleted file", async () => {
    mockGitWithFixture("s04-staged-deleted.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("deleted");
    expect(parsed.staged[0].file).toBe("old-file.ts");
  });

  it("S5 [recorded] staged rename with oldFile", async () => {
    mockGitWithFixture("s05-staged-rename.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("renamed");
    expect(parsed.staged[0].file).toBe("new-name.ts");
    expect(parsed.staged[0].oldFile).toBe("old-name.ts");
  });

  it("S6 [recorded] worktree modified", async () => {
    mockGitWithFixture("s06-wt-modified.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.modified).toEqual(["src-index.ts"]);
    expect(parsed.staged).toEqual([]);
  });

  it("S7 [recorded] worktree deleted", async () => {
    mockGitWithFixture("s07-wt-deleted.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.deleted).toEqual(["removed.ts"]);
  });

  it("S8 [recorded] untracked files", async () => {
    mockGitWithFixture("s08-untracked.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.untracked).toContain("new-file.txt");
    expect(parsed.untracked).toContain("another.txt");
    expect(parsed.untracked.length).toBe(2);
  });

  it("S9 [recorded] mixed state", async () => {
    mockGitWithFixture("s09-mixed.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.modified).toContain("modified.ts");
    expect(parsed.untracked).toContain("untracked.txt");
    expect(parsed.clean).toBe(false);
  });

  it("S10 [recorded] both staged and worktree modified (MM)", async () => {
    mockGitWithFixture("s10-mm.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].file).toBe("src-index.ts");
    expect(parsed.modified).toContain("src-index.ts");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Branch & upstream (S11–S17)
  // ═══════════════════════════════════════════════════════════════════

  it("S11 [recorded] branch with upstream tracking", async () => {
    mockGitWithFixture("s11-upstream.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBe("main");
    expect(parsed.upstream).toBe("origin/main");
  });

  it("S12 [recorded] ahead of upstream", async () => {
    mockGitWithFixture("s12-ahead.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.ahead).toBe(3);
    expect(parsed.branch).toBe("main");
  });

  it("S13 [recorded] behind upstream", async () => {
    mockGitWithFixture("s13-behind.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.behind).toBe(2);
    expect(parsed.branch).toBe("main");
  });

  it("S14 [recorded] ahead and behind upstream", async () => {
    mockGitWithFixture("s14-ahead-behind.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.ahead).toBe(3);
    expect(parsed.behind).toBe(2);
  });

  it("S15 [recorded] detached HEAD", async () => {
    mockGitWithFixture("s15-detached.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBeDefined();
    expect(parsed.upstream).toBeUndefined();
  });

  it("S16 [recorded] branch without upstream", async () => {
    mockGitWithFixture("s16-no-upstream.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBe("feature-branch");
    expect(parsed.upstream).toBeUndefined();
    expect(parsed.ahead).toBeUndefined();
    expect(parsed.behind).toBeUndefined();
  });

  it("S17 [recorded] new branch with no commits", async () => {
    mockGitWithFixture("s17-new-branch.txt");
    const { parsed } = await callAndValidate({});
    // "## No commits yet on new-branch" — parser should extract branch name
    expect(parsed.branch).toBeDefined();
    expect(parsed.upstream).toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Conflicts (S18–S20)
  // ═══════════════════════════════════════════════════════════════════

  it("S18 [recorded] merge conflict UU", async () => {
    mockGitWithFixture("s18-conflict-uu.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toContain("conflicted.ts");
  });

  it("S19 [recorded] both added conflict AA", async () => {
    mockGitWithFixture("s19-aa-conflict.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toContain("both-added.ts");
  });

  it("S20 [recorded] multiple conflicts", async () => {
    mockGitWithFixture("s20-multi-conflict.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toContain("file1.ts");
    expect(parsed.conflicts).toContain("file2.ts");
    expect(parsed.conflicts).toContain("file3.ts");
    expect(parsed.conflicts.length).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Porcelain v2 (S35–S38)
  // ═══════════════════════════════════════════════════════════════════

  it("S35 [recorded] porcelain v2 clean repo", async () => {
    mockGitWithFixture("s35-v2-clean.txt");
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.branch).toBe("main");
    expect(parsed.clean).toBe(true);
  });

  it("S36 [recorded] porcelain v2 with staged change", async () => {
    mockGitWithFixture("s36-v2-staged.txt");
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.staged.length).toBeGreaterThan(0);
    expect(parsed.clean).toBe(false);
  });

  it("S37 [recorded] porcelain v2 with conflicts", async () => {
    mockGitWithFixture("s37-v2-conflict.txt");
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.conflicts.length).toBe(3);
  });

  it("S38 [recorded] porcelain v2 with rename", async () => {
    mockGitWithFixture("s38-v2-rename.txt");
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.staged.length).toBeGreaterThan(0);
    expect(parsed.staged[0].status).toBe("renamed");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Error paths (S39)
  // ═══════════════════════════════════════════════════════════════════

  it("S39 [recorded] not a git repo throws error", async () => {
    const stderr = loadFixture("s39-not-repo-stderr.txt");
    vi.mocked(git).mockResolvedValueOnce({
      stdout: "",
      stderr,
      exitCode: 128,
    });
    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow("git status failed");
  });
});
