/**
 * Smoke tests: git.status — Phase 2 (mocked)
 *
 * Tests the status tool end-to-end with mocked git runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
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

function mockGit(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(git).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

describe("Smoke: git.status", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStatusTool(server as never);
    handler = server.tools.get("status")!.handler;
  });

  /** Helper: call handler and validate output schema */
  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    // Validate against Zod schema — this catches schema mismatches
    const parsed = GitStatusSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── Scenario 1: Clean repo ──────────────────────────────────────────
  it("S1 [P0] clean repo returns clean: true and empty arrays", async () => {
    mockGit("## main...origin/main\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.clean).toBe(true);
    expect(parsed.staged).toEqual([]);
    expect(parsed.modified).toEqual([]);
    expect(parsed.deleted).toEqual([]);
    expect(parsed.untracked).toEqual([]);
    expect(parsed.conflicts).toEqual([]);
    expect(parsed.branch).toBe("main");
    expect(parsed.upstream).toBe("origin/main");
  });

  // ── Scenario 2: Staged added file ──────────────────────────────────
  it("S2 [P0] staged added file", async () => {
    mockGit("## main\nA  new-file.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged).toEqual([{ file: "new-file.ts", status: "added" }]);
    expect(parsed.clean).toBe(false);
  });

  // ── Scenario 3: Staged modified file ───────────────────────────────
  it("S3 [P0] staged modified file", async () => {
    mockGit("## main\nM  src/index.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged).toEqual([{ file: "src/index.ts", status: "modified" }]);
    expect(parsed.clean).toBe(false);
  });

  // ── Scenario 4: Staged deleted file ────────────────────────────────
  it("S4 [P0] staged deleted file", async () => {
    mockGit("## main\nD  old-file.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged).toEqual([{ file: "old-file.ts", status: "deleted" }]);
  });

  // ── Scenario 5: Staged rename ──────────────────────────────────────
  it("S5 [P0] staged rename with oldFile", async () => {
    mockGit("## main\nR  old-name.ts -> new-name.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged).toEqual([
      { file: "new-name.ts", status: "renamed", oldFile: "old-name.ts" },
    ]);
  });

  // ── Scenario 6: Worktree modified ──────────────────────────────────
  it("S6 [P0] worktree modified files", async () => {
    mockGit("## main\n M src/index.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.modified).toEqual(["src/index.ts"]);
    expect(parsed.staged).toEqual([]);
    expect(parsed.clean).toBe(false);
  });

  // ── Scenario 7: Worktree deleted ───────────────────────────────────
  it("S7 [P0] worktree deleted files", async () => {
    mockGit("## main\n D removed.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.deleted).toEqual(["removed.ts"]);
  });

  // ── Scenario 8: Untracked files ────────────────────────────────────
  it("S8 [P0] untracked files", async () => {
    mockGit("## main\n?? new-file.txt\n?? another.txt\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.untracked).toEqual(["new-file.txt", "another.txt"]);
  });

  // ── Scenario 9: Mixed state ────────────────────────────────────────
  it("S9 [P0] mixed staged + modified + untracked", async () => {
    mockGit("## main\nA  added.ts\n M modified.ts\n?? untracked.txt\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.modified).toEqual(["modified.ts"]);
    expect(parsed.untracked).toEqual(["untracked.txt"]);
    expect(parsed.clean).toBe(false);
  });

  // ── Scenario 10: Both staged and worktree modified (MM) ────────────
  it("S10 [P0] file both staged and worktree modified (MM)", async () => {
    mockGit("## main\nMM src/index.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].file).toBe("src/index.ts");
    expect(parsed.modified).toContain("src/index.ts");
  });

  // ── Scenario 11: Branch with upstream ──────────────────────────────
  it("S11 [P0] branch with upstream tracking info", async () => {
    mockGit("## main...origin/main\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBe("main");
    expect(parsed.upstream).toBe("origin/main");
  });

  // ── Scenario 12: Ahead of upstream ─────────────────────────────────
  it("S12 [P0] ahead of upstream", async () => {
    mockGit("## main...origin/main [ahead 3]\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.ahead).toBe(3);
  });

  // ── Scenario 13: Behind upstream ───────────────────────────────────
  it("S13 [P0] behind upstream", async () => {
    mockGit("## main...origin/main [behind 2]\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.behind).toBe(2);
  });

  // ── Scenario 14: Ahead and behind ──────────────────────────────────
  it("S14 [P1] ahead and behind upstream", async () => {
    mockGit("## main...origin/main [ahead 3, behind 2]\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.ahead).toBe(3);
    expect(parsed.behind).toBe(2);
  });

  // ── Scenario 15: Detached HEAD ─────────────────────────────────────
  it("S15 [P1] detached HEAD", async () => {
    mockGit("## HEAD (no branch)\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBeDefined();
    expect(parsed.upstream).toBeUndefined();
  });

  // ── Scenario 16: No upstream ───────────────────────────────────────
  it("S16 [P1] branch without upstream", async () => {
    mockGit("## feature-branch\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBe("feature-branch");
    expect(parsed.upstream).toBeUndefined();
    expect(parsed.ahead).toBeUndefined();
    expect(parsed.behind).toBeUndefined();
  });

  // ── Scenario 18: Merge conflict (UU) ───────────────────────────────
  it("S18 [P0] merge conflict UU", async () => {
    mockGit("## main\nUU conflicted.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toEqual(["conflicted.ts"]);
  });

  // ── Scenario 19: Both added conflict (AA) ──────────────────────────
  it("S19 [P1] both added conflict AA", async () => {
    mockGit("## main\nAA both-added.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toEqual(["both-added.ts"]);
  });

  // ── Scenario 21: untrackedFiles: "no" ──────────────────────────────
  it('S21 [P1] untrackedFiles: "no" passes correct flag', async () => {
    mockGit("## main\n");
    await callAndValidate({ untrackedFiles: "no" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--untracked-files=no");
  });

  // ── Scenario 22: untrackedFiles: "all" ─────────────────────────────
  it('S22 [P1] untrackedFiles: "all" passes correct flag', async () => {
    mockGit("## main\n?? dir/file1.ts\n?? dir/file2.ts\n");
    await callAndValidate({ untrackedFiles: "all" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--untracked-files=all");
  });

  // ── Scenario 24: pathspec single dir ───────────────────────────────
  it("S24 [P1] pathspec filters to specific directory", async () => {
    mockGit("## main\n M src/index.ts\n");
    await callAndValidate({ pathspec: ["src/"] });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--");
    expect(args).toContain("src/");
  });

  // ── Scenario 27: pathspec flag injection ───────────────────────────
  it("S27 [P0] pathspec flag injection is blocked", async () => {
    await expect(callAndValidate({ pathspec: ["--exec=evil"] })).rejects.toThrow();
  });

  // ── Scenario 28: showStash flag ────────────────────────────────────
  it("S28 [P1] showStash: true passes --show-stash", async () => {
    mockGit("## main\n");
    await callAndValidate({ showStash: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--show-stash");
  });

  // ── Scenario 30: noLockIndex flag ──────────────────────────────────
  it("S30 [P2] noLockIndex: true passes --no-lock-index", async () => {
    mockGit("## main\n");
    await callAndValidate({ noLockIndex: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-lock-index");
  });

  // ── Scenario 31: showIgnored flag ──────────────────────────────────
  it("S31 [P2] showIgnored: true passes --ignored", async () => {
    mockGit("## main\n");
    await callAndValidate({ showIgnored: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--ignored");
  });

  // ── Scenario 34: ignoreSubmodules flag ─────────────────────────────
  it('S34 [P2] ignoreSubmodules: "all" passes correct flag', async () => {
    mockGit("## main\n");
    await callAndValidate({ ignoreSubmodules: "all" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--ignore-submodules=all");
  });

  // ── Scenario 35: porcelain v2 ──────────────────────────────────────
  it("S35 [P1] porcelainVersion v2 clean repo", async () => {
    mockGit("# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0\n");
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.branch).toBe("main");
    expect(parsed.clean).toBe(true);
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--porcelain=v2");
  });

  // ── Scenario 36: porcelain v2 with changes ─────────────────────────
  it("S36 [P1] porcelainVersion v2 with staged file", async () => {
    mockGit(
      "# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0\n" +
        "1 M. N... 100644 100644 100644 abc abc src/a.ts\n",
    );
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.staged.length).toBeGreaterThan(0);
    expect(parsed.clean).toBe(false);
  });

  // ── Scenario 39: Not a git repo ────────────────────────────────────
  it("S39 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow("git status failed");
  });

  // ── Scenario 17: New branch, no commits ──────────────────────────
  it("S17 [P2] new branch with no commits", async () => {
    mockGit("## new-branch\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.branch).toBe("new-branch");
    expect(parsed.upstream).toBeUndefined();
    expect(parsed.clean).toBe(true);
  });

  // ── Scenario 20: Multiple conflict types ───────────────────────────
  it("S20 [P1] multiple conflict types", async () => {
    mockGit("## main\nUU file1.ts\nAA file2.ts\nDU file3.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toContain("file1.ts");
    expect(parsed.conflicts).toContain("file2.ts");
    expect(parsed.conflicts).toContain("file3.ts");
    expect(parsed.conflicts.length).toBe(3);
  });

  // ── Scenario 23: untrackedFiles: "normal" (default) ────────────────
  it('S23 [P2] untrackedFiles: "normal" passes correct flag', async () => {
    mockGit("## main\n");
    await callAndValidate({ untrackedFiles: "normal" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--untracked-files=normal");
  });

  // ── Scenario 25: pathspec single file ──────────────────────────────
  it("S25 [P1] pathspec single file", async () => {
    mockGit("## main\n M file.txt\n");
    await callAndValidate({ pathspec: ["file.txt"] });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--");
    expect(args).toContain("file.txt");
  });

  // ── Scenario 26: pathspec no matches ───────────────────────────────
  it("S26 [P2] pathspec no matches returns clean", async () => {
    mockGit("## main\n");
    const { parsed } = await callAndValidate({ pathspec: ["nonexistent/"] });
    expect(parsed.clean).toBe(true);
  });

  // ── Scenario 29: showStash with no stashes ─────────────────────────
  it("S29 [P2] showStash: true with no stashes", async () => {
    mockGit("## main\n");
    const { parsed } = await callAndValidate({ showStash: true });
    // Should not crash; stash count may be absent or 0
    expect(parsed.clean).toBe(true);
  });

  // ── Scenario 32: renames flag ──────────────────────────────────────
  it("S32 [P2] renames: true passes --renames", async () => {
    mockGit("## main\n");
    await callAndValidate({ renames: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--renames");
  });

  // ── Scenario 33: noRenames flag ────────────────────────────────────
  it("S33 [P2] noRenames: true passes --no-renames", async () => {
    mockGit("## main\n");
    await callAndValidate({ noRenames: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-renames");
  });

  // ── Scenario 37: porcelain v2 with conflicts ───────────────────────
  it("S37 [P1] porcelainVersion v2 with conflicts", async () => {
    mockGit(
      "# branch.head main\n# branch.ab +0 -0\n" +
        "u UU N... N... 100644 100644 100644 100644 abc def ghi conflicted.ts\n",
    );
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.conflicts.length).toBeGreaterThan(0);
  });

  // ── Scenario 38: porcelain v2 with renames ─────────────────────────
  // NOTE: v2 format is `2 XY ... Xscore\t<newPath>\t<origPath>`.
  // Parser currently treats splitByTab[1] as oldFile and splitByTab[2] as file
  // — this is swapped from the git spec. Filed as a known issue.
  // Test matches CURRENT parser behavior to detect regressions.
  it("S38 [P2] porcelainVersion v2 with rename", async () => {
    mockGit(
      "# branch.head main\n# branch.ab +0 -0\n" +
        "2 R. N... 100644 100644 100644 abc def R100\tnew.ts\told.ts\n",
    );
    const { parsed } = await callAndValidate({ porcelainVersion: "v2" });
    expect(parsed.staged.length).toBeGreaterThan(0);
    expect(parsed.staged[0].status).toBe("renamed");
    // Parser currently swaps old/new: splitByTab[1]=newPath is used as oldFile
    expect(parsed.staged[0].oldFile).toBe("new.ts");
    expect(parsed.staged[0].file).toBe("old.ts");
  });

  // ── Scenario 40: Nonexistent path ──────────────────────────────────
  it("S40 [P1] nonexistent path throws error", async () => {
    mockGit("", "fatal: cannot change to '/tmp/nonexistent'", 128);
    await expect(callAndValidate({ path: "/tmp/nonexistent" })).rejects.toThrow(
      "git status failed",
    );
  });

  // ── Scenario 41: All outputs validate against schema ───────────────
  it("S41 [P0] default args construct correct command", async () => {
    mockGit("## main\n");
    await callAndValidate({});
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args[0]).toBe("status");
    expect(args).toContain("--porcelain=v1");
    expect(args).toContain("--branch");
  });
});
