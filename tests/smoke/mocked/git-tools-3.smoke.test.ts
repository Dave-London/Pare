/**
 * Smoke tests: git push, rebase, reflog, remote, reset, restore — Phase 2 (mocked)
 *
 * Tests each tool end-to-end with mocked git runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 *
 * ~84 scenarios: push (15), rebase (16), reflog (13), remote (13), reset (13), restore (14)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitPushSchema,
  GitRebaseSchema,
  GitReflogSchema,
  GitRemoteSchema,
  GitResetSchema,
  GitRestoreSchema,
} from "../../../packages/server-git/src/schemas/index.js";

vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerPushTool } from "../../../packages/server-git/src/tools/push.js";
import { registerRebaseTool } from "../../../packages/server-git/src/tools/rebase.js";
import { registerReflogTool } from "../../../packages/server-git/src/tools/reflog.js";
import { registerRemoteTool } from "../../../packages/server-git/src/tools/remote.js";
import { registerResetTool } from "../../../packages/server-git/src/tools/reset.js";
import { registerRestoreTool } from "../../../packages/server-git/src/tools/restore.js";

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

/** Default params for push (Zod defaults applied by MCP SDK, must be explicit in tests). */
const PUSH_DEFAULTS = { remote: "origin", force: false, setUpstream: false };

/** Default params for rebase. */
const REBASE_DEFAULTS = { abort: false, continue: false, skip: false, quit: false };

/** Default params for reflog. */
const REFLOG_DEFAULTS = { action: "show" as const, maxCount: 20, compact: true };

/** Default params for remote. */
const REMOTE_DEFAULTS = { action: "list" as const, compact: true };

/** Default params for reset. */
const RESET_DEFAULTS = { ref: "HEAD" };

/** Default params for restore. */
const RESTORE_DEFAULTS = { staged: false };

// ============================================================================
// PUSH (15 scenarios)
// ============================================================================
describe("Smoke: git.push", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerPushTool(server as never);
    handler = server.tools.get("push")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...PUSH_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitPushSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] successful push to origin", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc1234..def5678  main -> main");
    const { parsed } = await callAndValidate({});
    expect(parsed.success).toBe(true);
  });

  it("S2 [P0] push creates new remote branch", async () => {
    mockGit("", "To github.com:user/repo.git\n * [new branch]      feature -> feature");
    const { parsed } = await callAndValidate({ branch: "feature" });
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
  });

  it("S3 [P0] push rejected (non-fast-forward)", async () => {
    mockGit(
      "",
      "To github.com:user/repo.git\n ! [rejected]        main -> main (non-fast-forward)\nerror: failed to push some refs\nhint: Updates were rejected because the tip of your current branch is behind",
      1,
    );
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("rejected");
  });

  it("S4 [P0] force push passes --force flag", async () => {
    mockGit("", "To github.com:user/repo.git\n + abc1234...def5678 main -> main (forced update)");
    await callAndValidate({ force: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--force");
  });

  it("S5 [P0] set upstream passes -u flag and resolves current branch", async () => {
    // First call: rev-parse to get current branch
    mockGit("feature\n");
    // Second call: the actual push
    mockGit("", "To github.com:user/repo.git\n * [new branch]      feature -> feature");
    const { parsed } = await callAndValidate({ setUpstream: true });
    expect(parsed.success).toBe(true);
    const pushArgs = vi.mocked(git).mock.calls[1][0];
    expect(pushArgs).toContain("-u");
    expect(pushArgs).toContain("feature");
  });

  it("S6 [P1] dry run passes --dry-run flag", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc1234..def5678  main -> main");
    await callAndValidate({ dryRun: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--dry-run");
  });

  it("S7 [P1] force-with-lease passes --force-with-lease flag", async () => {
    mockGit("", "To github.com:user/repo.git\n + abc1234...def5678 main -> main (forced update)");
    await callAndValidate({ forceWithLease: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--force-with-lease");
  });

  it("S8 [P1] push tags passes --tags flag", async () => {
    mockGit("", "To github.com:user/repo.git\n * [new tag]         v1.0.0 -> v1.0.0");
    await callAndValidate({ tags: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--tags");
  });

  it("S9 [P1] follow-tags passes --follow-tags flag", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc..def  main -> main");
    await callAndValidate({ followTags: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--follow-tags");
  });

  it("S10 [P1] delete remote branch passes --delete flag", async () => {
    mockGit("", "To github.com:user/repo.git\n - [deleted]         old-branch");
    await callAndValidate({ delete: true, branch: "old-branch" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--delete");
  });

  it("S11 [P1] no-verify passes --no-verify flag", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc..def  main -> main");
    await callAndValidate({ noVerify: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-verify");
  });

  it("S12 [P1] atomic passes --atomic flag", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc..def  main -> main");
    await callAndValidate({ atomic: true, branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--atomic");
  });

  it("S13 [P1] push options pass -o flags", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc..def  main -> main");
    await callAndValidate({ pushOption: ["ci.skip", "merge_request.create"], branch: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-o");
    expect(args).toContain("ci.skip");
    expect(args).toContain("merge_request.create");
  });

  it("S14 [P1] explicit refspec is used instead of branch", async () => {
    mockGit("", "To github.com:user/repo.git\n   abc..def  HEAD:refs/heads/deploy -> deploy");
    await callAndValidate({ refspec: "HEAD:refs/heads/deploy" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("HEAD:refs/heads/deploy");
  });

  it("S15 [P0] flag injection in remote is blocked", async () => {
    await expect(callAndValidate({ remote: "--exec=evil" })).rejects.toThrow();
  });
});

// ============================================================================
// REBASE (16 scenarios)
// ============================================================================
describe("Smoke: git.rebase", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRebaseTool(server as never);
    handler = server.tools.get("rebase")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...REBASE_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRebaseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] successful rebase onto main", async () => {
    // rev-parse HEAD (current branch)
    mockGit("feature\n");
    // git log --oneline main..HEAD (commit count)
    mockGit("abc1234 commit1\ndef5678 commit2\n");
    // git rebase main
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    // git merge-base --is-ancestor (verification)
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
    expect(parsed.rebasedCommits).toBe(2);
    expect(parsed.verified).toBe(true);
  });

  it("S2 [P0] rebase with conflicts", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit(
      "CONFLICT (content): Merge conflict in src/index.ts\nerror: could not apply abc1234",
      "",
      1,
    );
    // verification after conflict
    mockGit("", "not ancestor", 1);
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.success).toBe(false);
    expect(parsed.state).toBe("conflict");
    expect(parsed.conflicts).toContain("src/index.ts");
  });

  it("S3 [P0] rebase abort", async () => {
    mockGit("feature\n");
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ abort: true });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
  });

  it("S4 [P0] rebase continue after conflict resolution", async () => {
    mockGit("feature\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    // verification
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ continue: true, branch: "main" });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
  });

  it("S5 [P1] rebase skip", async () => {
    mockGit("feature\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    // verification
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ skip: true, branch: "main" });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
  });

  it("S6 [P1] rebase quit", async () => {
    mockGit("feature\n");
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ quit: true });
    expect(parsed.success).toBe(true);
  });

  it("S7 [P1] rebase with --onto flag", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", onto: "develop" });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--onto");
    expect(rebaseArgs).toContain("develop");
  });

  it("S8 [P1] rebase with strategy option", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", strategy: "ort", strategyOption: "theirs" });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--strategy=ort");
    expect(rebaseArgs).toContain("-Xtheirs");
  });

  it("S9 [P1] rebase with autostash", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", autostash: true });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--autostash");
  });

  it("S10 [P1] rebase with autosquash", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", autosquash: true });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--autosquash");
  });

  it("S11 [P1] rebase with force-rebase", async () => {
    mockGit("feature\n");
    mockGit("");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", forceRebase: true });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--force-rebase");
  });

  it("S12 [P1] rebase with rebase-merges", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", rebaseMerges: true });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--rebase-merges");
  });

  it("S13 [P1] rebase with exec command", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", exec: "npm test" });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--exec=npm test");
  });

  it("S14 [P1] rebase with empty=drop", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    mockGit("Successfully rebased and updated refs/heads/feature.\n");
    mockGit("", "", 0);
    await callAndValidate({ branch: "main", empty: "drop" });
    const rebaseArgs = vi.mocked(git).mock.calls[2][0];
    expect(rebaseArgs).toContain("--empty=drop");
  });

  it("S15 [P0] branch is required for normal rebase", async () => {
    mockGit("feature\n");
    await expect(callAndValidate({})).rejects.toThrow("branch is required for rebase");
  });

  it("S16 [P0] flag injection in branch is blocked", async () => {
    mockGit("feature\n");
    mockGit("abc1234 commit1\n");
    await expect(callAndValidate({ branch: "--exec=evil" })).rejects.toThrow();
  });
});

// ============================================================================
// REFLOG (13 scenarios)
// ============================================================================
describe("Smoke: git.reflog", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerReflogTool(server as never);
    handler = server.tools.get("reflog")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...REFLOG_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitReflogSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const REFLOG_LINE =
    "abc1234567890abcdef1234567890abcdef123456\tabc1234\tHEAD@{0}\tcheckout: moving from main to feature\t2025-01-15 10:00:00 +0000";

  it("S1 [P0] default reflog returns entries", async () => {
    mockGit(REFLOG_LINE + "\n");
    // count query
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.entries.length).toBe(1);
  });

  it("S2 [P0] reflog entries have correct structure (full mode)", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.entries.length).toBe(1);
    const entry = parsed.entries[0];
    expect(typeof entry).toBe("object");
    if (typeof entry === "object" && entry !== null && "hash" in entry) {
      expect(entry.hash).toBe("abc1234567890abcdef1234567890abcdef123456");
      expect(entry.action).toBe("checkout");
      expect(entry.description).toBe("moving from main to feature");
    }
  });

  it("S3 [P0] reflog exists action (exists)", async () => {
    mockGit("", "", 0);
    const { parsed } = await callAndValidate({ action: "exists" });
    expect(parsed.entries.length).toBeGreaterThanOrEqual(0);
  });

  it("S4 [P0] reflog exists action (does not exist)", async () => {
    mockGit("", "error: reflog does not exist", 1);
    const { parsed } = await callAndValidate({ action: "exists", ref: "refs/heads/nonexistent" });
    expect(parsed.entries.length).toBe(0);
  });

  it("S5 [P1] maxCount limits results", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ maxCount: 5 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--max-count=5");
  });

  it("S6 [P1] ref parameter is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ ref: "refs/heads/main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("refs/heads/main");
  });

  it("S7 [P1] grepReflog filter is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ grepReflog: "checkout" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--grep-reflog=checkout");
  });

  it("S8 [P1] since filter is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ since: "2025-01-01" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--since=2025-01-01");
  });

  it("S9 [P1] until filter is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ until: "2025-12-31" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--until=2025-12-31");
  });

  it("S10 [P1] skip parameter is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ skip: 5 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--skip=5");
  });

  it("S11 [P1] all flag is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--all");
  });

  it("S12 [P1] reverse flag is passed", async () => {
    mockGit(REFLOG_LINE + "\n");
    mockGit("abc1234567890abcdef1234567890abcdef123456\n");
    await callAndValidate({ reverse: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--reverse");
  });

  it("S13 [P0] reflog failure throws error", async () => {
    mockGit("", "fatal: bad default revision 'HEAD'", 128);
    await expect(callAndValidate({})).rejects.toThrow("git reflog failed");
  });
});

// ============================================================================
// REMOTE (13 scenarios)
// ============================================================================
describe("Smoke: git.remote", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRemoteTool(server as never);
    handler = server.tools.get("remote")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...REMOTE_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRemoteSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] list remotes (default action)", async () => {
    mockGit(
      "origin\thttps://github.com/user/repo.git (fetch)\norigin\thttps://github.com/user/repo.git (push)\n",
    );
    // remote show origin for tracked branches
    mockGit(
      "* remote origin\n  Fetch URL: https://github.com/user/repo.git\n  Push  URL: https://github.com/user/repo.git\n  HEAD branch: main\n  Remote branch:\n    main tracked\n  Local branch configured for 'git pull':\n    main merges with remote main\n",
    );
    const { parsed } = await callAndValidate({});
    expect(parsed.remotes).toBeDefined();
    expect(Array.isArray(parsed.remotes)).toBe(true);
  });

  it("S2 [P0] add remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({
      action: "add",
      name: "upstream",
      url: "https://github.com/upstream/repo.git",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("add");
    expect(parsed.name).toBe("upstream");
    expect(parsed.url).toBe("https://github.com/upstream/repo.git");
  });

  it("S3 [P0] remove remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ action: "remove", name: "upstream" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("remove");
    expect(parsed.name).toBe("upstream");
  });

  it("S4 [P1] rename remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({
      action: "rename",
      oldName: "origin",
      newName: "upstream",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("rename");
    expect(parsed.oldName).toBe("origin");
    expect(parsed.newName).toBe("upstream");
  });

  it("S5 [P1] set-url remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({
      action: "set-url",
      name: "origin",
      url: "https://github.com/new/repo.git",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("set-url");
    expect(parsed.url).toBe("https://github.com/new/repo.git");
  });

  it("S6 [P1] prune remote with stale branches", async () => {
    mockGit(
      "",
      "Pruning origin\nURL: https://github.com/user/repo.git\n * [pruned] origin/old-branch\n",
    );
    const { parsed } = await callAndValidate({ action: "prune", name: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("prune");
    expect(parsed.prunedBranches).toBeDefined();
  });

  it("S7 [P1] show remote details", async () => {
    mockGit(
      "* remote origin\n  Fetch URL: https://github.com/user/repo.git\n  Push  URL: https://github.com/user/repo.git\n  HEAD branch: main\n  Remote branch:\n    main tracked\n  Local branch configured for 'git pull':\n    main merges with remote main\n",
    );
    const { parsed } = await callAndValidate({ action: "show", name: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("show");
    expect(parsed.showDetails).toBeDefined();
  });

  it("S8 [P1] update all remotes", async () => {
    mockGit("Fetching origin\n");
    const { parsed } = await callAndValidate({ action: "update" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("update");
    expect(parsed.name).toBe("all");
  });

  it("S9 [P1] update specific remote", async () => {
    mockGit("Fetching origin\n");
    const { parsed } = await callAndValidate({ action: "update", name: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe("origin");
  });

  it("S10 [P0] add remote requires name", async () => {
    await expect(
      callAndValidate({ action: "add", url: "https://github.com/user/repo.git" }),
    ).rejects.toThrow("'name' parameter is required");
  });

  it("S11 [P0] add remote requires url", async () => {
    await expect(callAndValidate({ action: "add", name: "upstream" })).rejects.toThrow(
      "'url' parameter is required",
    );
  });

  it("S12 [P0] rename remote requires oldName and newName", async () => {
    await expect(callAndValidate({ action: "rename" })).rejects.toThrow(
      "'oldName' parameter is required",
    );
  });

  it("S13 [P0] flag injection in remote name is blocked", async () => {
    await expect(
      callAndValidate({
        action: "add",
        name: "--exec=evil",
        url: "https://github.com/user/repo.git",
      }),
    ).rejects.toThrow();
  });
});

// ============================================================================
// RESET (13 scenarios)
// ============================================================================
describe("Smoke: git.reset", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerResetTool(server as never);
    handler = server.tools.get("reset")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...RESET_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitResetSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] default mixed reset HEAD", async () => {
    // rev-parse HEAD (before)
    mockGit("abc1234567890\n");
    // git reset HEAD
    mockGit("M\tsrc/index.ts\n");
    // rev-parse HEAD (after)
    mockGit("abc1234567890\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.ref).toBe("HEAD");
    expect(parsed.filesAffected).toContain("src/index.ts");
  });

  it("S2 [P0] soft reset", async () => {
    mockGit("abc1234567890\n");
    mockGit("");
    mockGit("def5678901234\n");
    const { parsed } = await callAndValidate({ mode: "soft", ref: "HEAD~1" });
    expect(parsed.ref).toBe("HEAD~1");
    expect(parsed.mode).toBe("soft");
  });

  it("S3 [P0] hard reset requires confirm", async () => {
    await expect(callAndValidate({ mode: "hard", ref: "HEAD~1" })).rejects.toThrow("Safety guard");
  });

  it("S4 [P0] hard reset with confirm proceeds", async () => {
    mockGit("abc1234567890\n");
    mockGit("HEAD is now at def5678 some commit message\n");
    mockGit("def5678901234\n");
    const { parsed } = await callAndValidate({ mode: "hard", ref: "HEAD~1", confirm: true });
    expect(parsed.ref).toBe("HEAD~1");
    expect(parsed.mode).toBe("hard");
  });

  it("S5 [P0] mixed reset with files (unstage)", async () => {
    mockGit("abc1234567890\n");
    mockGit("M\tsrc/index.ts\n");
    mockGit("abc1234567890\n");
    const { parsed } = await callAndValidate({ files: ["src/index.ts"] });
    expect(parsed.filesAffected).toContain("src/index.ts");
    const resetArgs = vi.mocked(git).mock.calls[1][0];
    expect(resetArgs).toContain("--");
    expect(resetArgs).toContain("src/index.ts");
  });

  it("S6 [P0] hard + files combination is rejected", async () => {
    await expect(
      callAndValidate({ mode: "hard", files: ["src/index.ts"], confirm: true }),
    ).rejects.toThrow("Cannot use --hard with specific files");
  });

  it("S7 [P0] soft + files combination is rejected", async () => {
    await expect(callAndValidate({ mode: "soft", files: ["src/index.ts"] })).rejects.toThrow(
      "Cannot use --soft with specific files",
    );
  });

  it("S8 [P1] reset to specific ref with previousRef and newRef", async () => {
    mockGit("abc1234567890\n");
    mockGit("M\tfile.ts\n");
    mockGit("def5678901234\n");
    const { parsed } = await callAndValidate({ ref: "abc1234" });
    expect(parsed.ref).toBe("abc1234");
    expect(parsed.previousRef).toBe("abc1234567890");
    expect(parsed.newRef).toBe("def5678901234");
  });

  it("S9 [P1] keep mode passes --keep", async () => {
    mockGit("abc1234567890\n");
    mockGit("");
    mockGit("def5678901234\n");
    await callAndValidate({ mode: "keep", ref: "HEAD~1" });
    const resetArgs = vi.mocked(git).mock.calls[1][0];
    expect(resetArgs).toContain("--keep");
  });

  it("S10 [P1] merge mode passes --merge", async () => {
    mockGit("abc1234567890\n");
    mockGit("");
    mockGit("def5678901234\n");
    await callAndValidate({ mode: "merge", ref: "HEAD~1" });
    const resetArgs = vi.mocked(git).mock.calls[1][0];
    expect(resetArgs).toContain("--merge");
  });

  it("S11 [P1] intentToAdd passes -N flag", async () => {
    mockGit("abc1234567890\n");
    mockGit("M\tfile.ts\n");
    mockGit("abc1234567890\n");
    await callAndValidate({ intentToAdd: true });
    const resetArgs = vi.mocked(git).mock.calls[1][0];
    expect(resetArgs).toContain("-N");
  });

  it("S12 [P1] invalid ref returns error with errorType", async () => {
    mockGit("abc1234567890\n");
    mockGit("", "fatal: ambiguous argument 'nonexistent': unknown revision", 128);
    const { parsed } = await callAndValidate({ ref: "nonexistent" });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("invalid-ref");
  });

  it("S13 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ref: "--exec=evil" })).rejects.toThrow();
  });
});

// ============================================================================
// RESTORE (14 scenarios)
// ============================================================================
describe("Smoke: git.restore", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRestoreTool(server as never);
    handler = server.tools.get("restore")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler({ ...RESTORE_DEFAULTS, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRestoreSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] restore working tree file", async () => {
    // git restore -- src/index.ts
    mockGit("");
    // git status --porcelain=v1 (verification)
    mockGit("");
    const { parsed } = await callAndValidate({ files: ["src/index.ts"] });
    expect(parsed.restored).toContain("src/index.ts");
    expect(parsed.source).toBe("HEAD");
    expect(parsed.staged).toBe(false);
  });

  it("S2 [P0] restore staged file", async () => {
    mockGit("");
    mockGit("");
    const { parsed } = await callAndValidate({ files: ["src/index.ts"], staged: true });
    expect(parsed.staged).toBe(true);
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--staged");
  });

  it("S3 [P0] restore from specific source", async () => {
    mockGit("");
    mockGit("");
    const { parsed } = await callAndValidate({
      files: ["src/index.ts"],
      source: "HEAD~1",
    });
    expect(parsed.source).toBe("HEAD~1");
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--source");
    expect(args).toContain("HEAD~1");
  });

  it("S4 [P0] restore multiple files", async () => {
    mockGit("");
    mockGit("");
    const { parsed } = await callAndValidate({
      files: ["file1.ts", "file2.ts", "file3.ts"],
    });
    expect(parsed.restored).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
  });

  it("S5 [P0] files parameter is required", async () => {
    await expect(callAndValidate({ files: [] })).rejects.toThrow(
      "'files' must be provided with at least one file path",
    );
  });

  it("S6 [P1] --ours flag is passed during conflict", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["conflicted.ts"], ours: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--ours");
  });

  it("S7 [P1] --theirs flag is passed during conflict", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["conflicted.ts"], theirs: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--theirs");
  });

  it("S8 [P1] --worktree flag is passed", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["file.ts"], worktree: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--worktree");
  });

  it("S9 [P1] --merge flag is passed", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["file.ts"], merge: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--merge");
  });

  it("S10 [P1] --no-overlay flag is passed", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["file.ts"], noOverlay: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-overlay");
  });

  it("S11 [P1] --conflict style is passed", async () => {
    mockGit("");
    mockGit("");
    await callAndValidate({ files: ["file.ts"], conflict: "diff3" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--conflict=diff3");
  });

  it("S12 [P0] pathspec error returns errorType pathspec", async () => {
    mockGit("", "error: pathspec 'nonexistent.ts' did not match any file(s) known to git", 1);
    const { parsed } = await callAndValidate({ files: ["nonexistent.ts"] });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("pathspec");
    expect(parsed.restored).toEqual([]);
  });

  it("S13 [P1] invalid source returns errorType invalid-source", async () => {
    mockGit("", "fatal: invalid object name 'bad-ref'", 128);
    const { parsed } = await callAndValidate({ files: ["file.ts"], source: "bad-ref" });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("invalid-source");
  });

  it("S14 [P0] flag injection in files is blocked", async () => {
    await expect(callAndValidate({ files: ["--exec=evil"] })).rejects.toThrow();
  });
});
