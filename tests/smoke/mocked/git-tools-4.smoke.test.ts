/**
 * Smoke tests: git.show, git.stash, git.stash-list, git.tag, git.worktree — Phase 2 (mocked)
 *
 * Tests these tools end-to-end with mocked git runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 *
 * ~73 scenarios total:
 *   show (13), stash (16), stash-list (12), tag (16), worktree (16)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitShowSchema,
  GitStashSchema,
  GitStashListSchema,
  GitTagSchema,
  GitWorktreeOutputSchema,
} from "../../../packages/server-git/src/schemas/index.js";

vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerShowTool } from "../../../packages/server-git/src/tools/show.js";
import { registerStashTool } from "../../../packages/server-git/src/tools/stash.js";
import { registerStashListTool } from "../../../packages/server-git/src/tools/stash-list.js";
import { registerTagTool } from "../../../packages/server-git/src/tools/tag.js";
import { registerWorktreeTool } from "../../../packages/server-git/src/tools/worktree.js";

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

// ═══════════════════════════════════════════════════════════════════════════
// SHOW (13 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.show", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerShowTool(server as never);
    handler = server.tools.get("show")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitShowSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1: Show HEAD commit (default ref, compact: false for full data)
  it("S1 [P0] show HEAD commit returns hash, author, date, message, diff", async () => {
    // cat-file -t => commit
    mockGit("commit", "", 0);
    // show --no-patch --format=...
    mockGit(
      "abc1234567890abcdef1234567890abcdef123456\x00Alice <alice@example.com>\x002 hours ago\x00feat: add new feature\n",
    );
    // show --numstat --format=
    mockGit("3\t1\tsrc/index.ts\n");

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.hash).toContain("abc1234567890");
    expect(parsed.hashShort).toBe("abc1234");
    expect(parsed.author).toContain("Alice");
    expect(parsed.date).toContain("2 hours ago");
    expect(parsed.message).toContain("feat: add new feature");
    expect(parsed.diff).toBeDefined();
    expect(parsed.diff!.files.length).toBeGreaterThanOrEqual(1);
  });

  // S2: Show specific commit (compact: false for full data)
  it("S2 [P0] show specific commit by ref", async () => {
    mockGit("commit", "", 0);
    mockGit(
      "def5678901234567890abcdef1234567890abcdef\x00Bob <bob@example.com>\x003 days ago\x00fix: bug fix\n",
    );
    mockGit("1\t0\tlib/util.ts\n");

    const { parsed } = await callAndValidate({ ref: "def5678", compact: false });
    expect(parsed.hash).toContain("def5678");
    expect(parsed.author).toContain("Bob");
  });

  // S3: Invalid ref throws error
  it("S3 [P0] invalid ref throws error", async () => {
    mockGit("", "fatal: Not a valid object name nonexistent", 128);
    // cat-file -t fails => objectType = "unknown", then cat-file -p also fails
    mockGit("", "fatal: Not a valid object name nonexistent", 128);

    await expect(callAndValidate({ ref: "nonexistent" })).rejects.toThrow("git show failed");
  });

  // S4: Flag injection in ref
  it("S4 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ref: "--exec=evil" })).rejects.toThrow();
  });

  // S5: Show tag object (compact: false for full objectType data)
  it("S5 [P1] show tag object returns objectType tag", async () => {
    mockGit("tag", "", 0);
    mockGit("object abc1234\ntype commit\ntag v1.0\ntagger Alice\n\nRelease v1.0\n", "", 0);
    mockGit("142", "", 0);

    const { parsed } = await callAndValidate({ ref: "v1.0", compact: false });
    expect(parsed.objectType).toBe("tag");
    expect(parsed.objectName).toBe("v1.0");
    expect(parsed.message).toContain("Release v1.0");
  });

  // S6: Show tree object (compact: false for full objectType data)
  it("S6 [P1] show tree object returns objectType tree", async () => {
    mockGit("tree", "", 0);
    mockGit("100644 blob abc123\tREADME.md\n040000 tree def456\tsrc\n", "", 0);
    mockGit("85", "", 0);

    const { parsed } = await callAndValidate({ ref: "HEAD^{tree}", compact: false });
    expect(parsed.objectType).toBe("tree");
    expect(parsed.objectName).toBe("HEAD^{tree}");
    expect(parsed.objectSize).toBe(85);
  });

  // S7: Show blob object (compact: false for full objectType data)
  it("S7 [P1] show blob object returns objectType blob", async () => {
    mockGit("blob", "", 0);
    mockGit("# README\n\nHello world\n", "", 0);
    mockGit("28", "", 0);

    const { parsed } = await callAndValidate({ ref: "HEAD:README.md", compact: false });
    expect(parsed.objectType).toBe("blob");
    expect(parsed.message).toContain("Hello world");
  });

  // S8: Include patch flag
  it("S8 [P1] patch: true passes --patch to diff args", async () => {
    mockGit("commit", "", 0);
    mockGit(
      "abc1234567890abcdef1234567890abcdef123456\x00Alice <alice@example.com>\x002 hours ago\x00msg\n",
    );
    mockGit("1\t0\tfile.ts\n");

    await callAndValidate({ patch: true });
    const diffCall = vi.mocked(git).mock.calls[2];
    expect(diffCall[0]).toContain("--patch");
  });

  // S9: Custom date format
  it("S9 [P1] dateFormat: iso passes --date=iso", async () => {
    mockGit("commit", "", 0);
    mockGit(
      "abc1234567890abcdef1234567890abcdef123456\x00Alice <alice@example.com>\x002024-01-15T10:00:00+00:00\x00msg\n",
    );
    mockGit("");

    await callAndValidate({ dateFormat: "iso" });
    const infoCall = vi.mocked(git).mock.calls[1];
    expect(infoCall[0]).toContain("--date=iso");
  });

  // S10: Diff filter
  it("S10 [P2] diffFilter: M passes --diff-filter=M", async () => {
    mockGit("commit", "", 0);
    mockGit("abc1234567890abcdef1234567890abcdef123456\x00Alice <a@e.com>\x002 hours ago\x00msg\n");
    mockGit("2\t1\tmodified.ts\n");

    await callAndValidate({ diffFilter: "M" });
    const diffCall = vi.mocked(git).mock.calls[2];
    expect(diffCall[0]).toContain("--diff-filter=M");
  });

  // S11: Compact vs full output
  it("S11 [P2] compact: false returns full output", async () => {
    mockGit("commit", "", 0);
    mockGit("abc1234567890abcdef1234567890abcdef123456\x00Alice <a@e.com>\x002 hours ago\x00msg\n");
    mockGit("");

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.message).toBeDefined();
  });

  // S12: showSignature and notes flags
  it("S12 [P1] showSignature and notes flags are passed", async () => {
    mockGit("commit", "", 0);
    mockGit("abc1234567890abcdef1234567890abcdef123456\x00Alice <a@e.com>\x002 hours ago\x00msg\n");
    mockGit("");

    await callAndValidate({ showSignature: true, notes: true });
    const infoCall = vi.mocked(git).mock.calls[1];
    expect(infoCall[0]).toContain("--show-signature");
    expect(infoCall[0]).toContain("--notes");
  });

  // S13: Schema validation on all outputs (compact: false for full data)
  it("S13 [P0] schema validates for commit object", async () => {
    mockGit("commit", "", 0);
    mockGit(
      "1234567890abcdef1234567890abcdef12345678\x00Dave <d@e.com>\x001 day ago\x00chore: update deps\n",
    );
    mockGit("5\t2\tpackage.json\n2\t0\tpnpm-lock.yaml\n");

    const { parsed } = await callAndValidate({ compact: false });
    // If we get here, schema validation passed
    expect(parsed.hash).toBeDefined();
    expect(parsed.diff).toBeDefined();
    expect(parsed.diff!.files.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STASH (16 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.stash", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStashTool(server as never);
    handler = server.tools.get("stash")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStashSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1: Push (stash changes)
  it("S1 [P0] push stashes changes successfully", async () => {
    mockGit("Saved working directory and index state WIP on main: abc1234 initial commit", "", 0);

    const { parsed } = await callAndValidate({ action: "push" });
    expect(parsed.success).toBe(true);
    expect(parsed.stashRef).toBe("stash@{0}");
  });

  // S2: Pop stash
  it("S2 [P0] pop applies and removes stash", async () => {
    mockGit(
      "On branch main\nChanges not staged for commit:\n  modified: file.ts\nDropped stash@{0}",
      "",
      0,
    );

    const { parsed } = await callAndValidate({ action: "pop" });
    expect(parsed.success).toBe(true);
    expect(parsed.stashRef).toBe("stash@{0}");
  });

  // S3: Push with no changes
  it("S3 [P0] push with no changes returns success: false", async () => {
    mockGit("", "No local changes to save", 1);

    const { parsed } = await callAndValidate({ action: "push" });
    expect(parsed.success).toBe(false);
    expect(parsed.reason).toBe("no-local-changes");
  });

  // S4: Flag injection in message
  it("S4 [P0] flag injection in message is blocked", async () => {
    await expect(callAndValidate({ action: "push", message: "--exec=evil" })).rejects.toThrow();
  });

  // S5: Apply stash
  it("S5 [P0] apply applies stash without removing it", async () => {
    mockGit("On branch main\nChanges not staged for commit:\n  modified: file.ts\n", "", 0);

    const { parsed } = await callAndValidate({ action: "apply" });
    expect(parsed.success).toBe(true);
  });

  // S6: Drop stash
  it("S6 [P1] drop removes stash at index", async () => {
    mockGit("Dropped stash@{0} (abc1234)", "", 0);

    const { parsed } = await callAndValidate({ action: "drop", index: 0 });
    expect(parsed.success).toBe(true);
    expect(parsed.stashRef).toBe("stash@{0}");

    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("stash@{0}");
  });

  // S7: Clear all stashes
  it("S7 [P1] clear removes all stashes", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({ action: "clear" });
    expect(parsed.success).toBe(true);
  });

  // S8: Show stash
  it("S8 [P1] show stash returns diffStat", async () => {
    mockGit(
      " src/index.ts | 10 +++++++---\n 1 file changed, 7 insertions(+), 3 deletions(-)\n",
      "",
      0,
    );

    const { parsed } = await callAndValidate({ action: "show", index: 0 });
    expect(parsed.success).toBe(true);
    expect(parsed.diffStat).toBeDefined();
    expect(parsed.diffStat!.filesChanged).toBe(1);
    expect(parsed.diffStat!.insertions).toBe(7);
    expect(parsed.diffStat!.deletions).toBe(3);
  });

  // S9: Push with message
  it("S9 [P1] push with message passes -m flag", async () => {
    mockGit("Saved working directory and index state On main: WIP: feature", "", 0);

    await callAndValidate({ action: "push", message: "WIP: feature" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-m");
    expect(args).toContain("WIP: feature");
  });

  // S10: Push include untracked
  it("S10 [P1] push includeUntracked passes --include-untracked", async () => {
    mockGit("Saved working directory and index state WIP on main: abc1234 msg", "", 0);

    await callAndValidate({ action: "push", includeUntracked: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--include-untracked");
  });

  // S11: Push staged only
  it("S11 [P1] push staged passes --staged", async () => {
    mockGit("Saved working directory and index state WIP on main: abc1234 msg", "", 0);

    await callAndValidate({ action: "push", staged: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--staged");
  });

  // S12: Stash branch
  it("S12 [P2] branch creates branch from stash", async () => {
    mockGit("Switched to a new branch 'stash-branch'\nDropped stash@{0}", "", 0);

    const { parsed } = await callAndValidate({
      action: "branch",
      branchName: "stash-branch",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.branchName).toBe("stash-branch");
  });

  // S13: Pop with conflict
  it("S13 [P2] pop with conflict returns conflictFiles", async () => {
    mockGit(
      "",
      "CONFLICT (content): Merge conflict in src/index.ts\nCONFLICT (content): Merge conflict in src/util.ts",
      1,
    );

    const { parsed } = await callAndValidate({ action: "pop" });
    expect(parsed.success).toBe(false);
    expect(parsed.conflictFiles).toBeDefined();
    expect(parsed.conflictFiles!.length).toBeGreaterThanOrEqual(1);
  });

  // S14: Show with patch
  it("S14 [P2] show with patch passes --patch", async () => {
    mockGit(
      " src/file.ts | 5 +++--\n 1 file changed, 3 insertions(+), 2 deletions(-)\n\ndiff --git a/src/file.ts b/src/file.ts\n...",
      "",
      0,
    );

    await callAndValidate({ action: "show", patch: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--patch");
  });

  // S15: Branch without branchName throws
  it("S15 [P0] branch without branchName throws error", async () => {
    await expect(callAndValidate({ action: "branch" })).rejects.toThrow("branchName is required");
  });

  // S16: Push with keepIndex and all flags
  it("S16 [P1] push with keepIndex and all flags", async () => {
    mockGit("Saved working directory and index state WIP on main: abc1234 msg", "", 0);

    await callAndValidate({ action: "push", keepIndex: true, all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--keep-index");
    expect(args).toContain("--all");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STASH-LIST (12 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.stash-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStashListTool(server as never);
    handler = server.tools.get("stash-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStashListSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1: List stashes (with stashes, compact: false for full objects)
  it("S1 [P0] list stashes returns stash entries", async () => {
    mockGit(
      "stash@{0}\tWIP on main: abc1234 initial commit\t2024-01-15 10:00:00 +0000\n" +
        "stash@{1}\tOn feature: def5678 work in progress\t2024-01-14 09:00:00 +0000\n",
    );

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.stashes.length).toBe(2);
    // Check first stash has expected structure
    const first = parsed.stashes[0] as Record<string, unknown>;
    expect(first).toHaveProperty("index", 0);
    expect(first).toHaveProperty("message");
  });

  // S2: List stashes (empty)
  it("S2 [P0] empty stash list returns total 0", async () => {
    mockGit("");

    const { parsed } = await callAndValidate({});
    expect(parsed.stashes).toEqual([]);
  });

  // S3: Not a git repo
  it("S3 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);

    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow(
      "git stash list failed",
    );
  });

  // S4: Flag injection in grep
  it("S4 [P0] flag injection in grep is blocked", async () => {
    await expect(callAndValidate({ grep: "--exec=evil" })).rejects.toThrow();
  });

  // S5: With maxCount
  it("S5 [P1] maxCount passes --max-count flag", async () => {
    mockGit(
      "stash@{0}\tWIP on main: abc1234 msg\t2024-01-15 10:00:00 +0000\n" +
        "stash@{1}\tWIP on main: def5678 msg\t2024-01-14 09:00:00 +0000\n" +
        "stash@{2}\tWIP on main: ghi9012 msg\t2024-01-13 09:00:00 +0000\n",
    );

    await callAndValidate({ maxCount: 3 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--max-count=3");
  });

  // S6: Grep filter
  it("S6 [P1] grep passes --grep flag", async () => {
    mockGit("stash@{0}\tWIP on main: abc1234 msg\t2024-01-15 10:00:00 +0000\n");

    await callAndValidate({ grep: "WIP" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--grep=WIP");
  });

  // S7: Include summary (compact: false to get full objects with files/summary)
  it("S7 [P1] includeSummary populates files and summary per stash", async () => {
    mockGit("stash@{0}\tWIP on main: abc1234 msg\t2024-01-15 10:00:00 +0000\n");
    // Additional stash show call per entry
    mockGit(" src/index.ts | 5 +++--\n 1 file changed, 3 insertions(+), 2 deletions(-)\n");

    const { parsed } = await callAndValidate({ includeSummary: true, compact: false });
    expect(parsed.stashes.length).toBe(1);
    const first = parsed.stashes[0] as Record<string, unknown>;
    expect(first).toHaveProperty("files", 1);
    expect(first).toHaveProperty("summary");
  });

  // S8: Since filter
  it("S8 [P2] since passes --since flag", async () => {
    mockGit("");

    await callAndValidate({ since: "2024-01-01" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--since=2024-01-01");
  });

  // S9: Custom date format
  it("S9 [P2] dateFormat passes --date flag", async () => {
    mockGit("stash@{0}\tWIP on main: abc msg\t2024-01-15\n");

    await callAndValidate({ dateFormat: "short" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--date=short");
  });

  // S10: Compact vs full output
  it("S10 [P2] compact: false returns full stash data", async () => {
    mockGit("stash@{0}\tWIP on main: abc1234 msg\t2024-01-15 10:00:00 +0000\n");

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.stashes.length).toBe(1);
    const first = parsed.stashes[0] as Record<string, unknown>;
    expect(first).toHaveProperty("date");
    expect(first).toHaveProperty("branch");
  });

  // S11: Schema validation
  it("S11 [P0] schema validates for multiple stash entries", async () => {
    mockGit(
      "stash@{0}\tWIP on main: abc1234 commit msg\t2024-01-15 10:00:00 +0000\n" +
        "stash@{1}\tOn feature: def5678 another msg\t2024-01-14 09:00:00 +0000\n" +
        "stash@{2}\tWIP on dev: ghi9012 third msg\t2024-01-13 08:00:00 +0000\n",
    );

    const { parsed } = await callAndValidate({});
    expect(parsed.stashes.length).toBe(3);
  });

  // S12: Flag injection in since
  it("S12 [P0] flag injection in since is blocked", async () => {
    await expect(callAndValidate({ since: "--exec=evil" })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TAG (16 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.tag", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerTagTool(server as never);
    handler = server.tools.get("tag")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitTagSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1: List tags
  it("S1 [P0] list tags returns tags array and total", async () => {
    mockGit(
      "v1.0\t2024-01-10T10:00:00+00:00\tRelease 1.0\tcommit\n" +
        "v0.9\t2024-01-05T09:00:00+00:00\tRelease 0.9\tcommit\n" +
        "v0.8\t2024-01-01T08:00:00+00:00\t\t\n",
    );

    const { parsed } = await callAndValidate({});
    expect(parsed.tags).toBeDefined();
    expect(parsed.tags!.length).toBe(3);
  });

  // S2: Create lightweight tag
  it("S2 [P0] create lightweight tag returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({ action: "create", name: "v1.0" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("create");
    expect(parsed.name).toBe("v1.0");
    expect(parsed.annotated).toBe(false);
  });

  // S3: Create annotated tag
  it("S3 [P0] create annotated tag with message", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "create",
      name: "v1.0",
      message: "Release 1.0",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("create");
    expect(parsed.annotated).toBe(true);

    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-a");
    expect(args).toContain("-m");
    expect(args).toContain("Release 1.0");
  });

  // S4: Delete tag
  it("S4 [P0] delete tag returns success", async () => {
    mockGit("Deleted tag 'v1.0' (was abc1234)", "", 0);

    const { parsed } = await callAndValidate({ action: "delete", name: "v1.0" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("delete");
    expect(parsed.name).toBe("v1.0");
  });

  // S5: Create without name throws
  it("S5 [P0] create without name throws error", async () => {
    await expect(callAndValidate({ action: "create" })).rejects.toThrow("name");
  });

  // S6: Flag injection in name
  it("S6 [P0] flag injection in name is blocked", async () => {
    await expect(callAndValidate({ action: "create", name: "--exec=evil" })).rejects.toThrow();
  });

  // S7: No tags in repo
  it("S7 [P0] no tags returns empty array and total 0", async () => {
    mockGit("");

    const { parsed } = await callAndValidate({});
    expect(parsed.tags).toBeDefined();
    expect(parsed.tags!.length).toBe(0);
  });

  // S8: Tag at specific commit
  it("S8 [P1] create tag at specific commit", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "create",
      name: "v1.0",
      commit: "abc1234",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.commit).toBe("abc1234");

    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("abc1234");
  });

  // S9: Pattern filter
  it("S9 [P1] pattern filter passes pattern to git", async () => {
    mockGit("v1.0\t2024-01-10T10:00:00+00:00\tRelease 1.0\tcommit\n");

    await callAndValidate({ pattern: "v1.*" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("v1.*");
  });

  // S10: Contains filter
  it("S10 [P1] contains filter passes --contains", async () => {
    mockGit("v1.0\t2024-01-10T10:00:00+00:00\tRelease 1.0\tcommit\n");

    await callAndValidate({ contains: "abc1234" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--contains=abc1234");
  });

  // S11: Sort by date
  it("S11 [P1] sortBy passes --sort flag", async () => {
    mockGit("v1.0\t2024-01-10T10:00:00+00:00\tRelease 1.0\tcommit\n");

    await callAndValidate({ sortBy: "version:refname" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--sort=version:refname");
  });

  // S12: Force overwrite tag
  it("S12 [P2] force: true passes --force on create", async () => {
    mockGit("", "", 0);

    await callAndValidate({ action: "create", name: "v1.0", force: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--force");
  });

  // S13: Compact vs full output
  it("S13 [P2] compact: false returns full tag data", async () => {
    mockGit(
      "v1.0\t2024-01-10T10:00:00+00:00\tRelease 1.0\tcommit\n" +
        "v0.9\t2024-01-05T09:00:00+00:00\t\t\n",
    );

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.tags).toBeDefined();
    expect(parsed.tags!.length).toBe(2);
    const first = parsed.tags![0] as Record<string, unknown>;
    expect(first).toHaveProperty("date");
    expect(first).toHaveProperty("tagType");
  });

  // S14: Schema validation
  it("S14 [P0] schema validates for all list and mutate outputs", async () => {
    mockGit(
      "v2.0\t2024-06-01T12:00:00+00:00\tMajor release\tcommit\n" +
        "v1.5\t2024-03-15T08:00:00+00:00\tMinor release\tcommit\n",
    );

    const { parsed } = await callAndValidate({});
    expect(parsed.tags).toBeDefined();
    expect(parsed.tags!.length).toBe(2);
  });

  // S15: Delete without name throws
  it("S15 [P0] delete without name throws error", async () => {
    await expect(callAndValidate({ action: "delete" })).rejects.toThrow("name");
  });

  // S16: Merged and noMerged flags
  it("S16 [P2] merged and noMerged flags are passed", async () => {
    mockGit("v1.0\t2024-01-10T10:00:00+00:00\tRelease\tcommit\n");

    await callAndValidate({ merged: true });
    const args1 = vi.mocked(git).mock.calls[0][0];
    expect(args1).toContain("--merged");

    vi.clearAllMocks();
    mockGit("v2.0\t2024-06-01T12:00:00+00:00\tRelease\tcommit\n");

    await callAndValidate({ noMerged: true });
    const args2 = vi.mocked(git).mock.calls[0][0];
    expect(args2).toContain("--no-merged");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKTREE (16 scenarios)
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.worktree", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerWorktreeTool(server as never);
    handler = server.tools.get("worktree")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitWorktreeOutputSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1: List worktrees (compact: false for full objects)
  it("S1 [P0] list worktrees returns worktrees array", async () => {
    mockGit(
      "worktree /home/user/project\nHEAD abc1234567890abcdef1234567890abcdef123456\nbranch refs/heads/main\n\n" +
        "worktree /home/user/project-wt\nHEAD def5678901234567890abcdef1234567890abcdef\nbranch refs/heads/feature\n\n",
    );

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.worktrees).toBeDefined();
    const wts = parsed.worktrees as Array<Record<string, unknown>>;
    expect(wts.length).toBe(2);
    expect(wts[0]).toHaveProperty("path", "/home/user/project");
    expect(wts[0]).toHaveProperty("branch", "main");
    expect(wts[1]).toHaveProperty("branch", "feature");
  });

  // S2: Add worktree
  it("S2 [P0] add worktree returns success", async () => {
    mockGit("Preparing worktree (checking out 'main')\nHEAD is now at abc1234 msg", "", 0);

    const { parsed } = await callAndValidate({
      action: "add",
      worktreePath: "../wt-test",
      branch: "main",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("add");
    expect(parsed.path).toBe("../wt-test");
    expect(parsed.head).toBe("abc1234");
  });

  // S3: Remove worktree
  it("S3 [P0] remove worktree returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "remove",
      worktreePath: "../wt-test",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("remove");
    expect(parsed.path).toBe("../wt-test");
  });

  // S4: Add without worktreePath throws
  it("S4 [P0] add without worktreePath throws error", async () => {
    await expect(callAndValidate({ action: "add" })).rejects.toThrow("'worktreePath' is required");
  });

  // S5: Flag injection in worktreePath
  it("S5 [P0] flag injection in worktreePath is blocked", async () => {
    await expect(callAndValidate({ action: "add", worktreePath: "--exec=evil" })).rejects.toThrow();
  });

  // S6: Add with new branch
  it("S6 [P1] add with createBranch passes -b flag", async () => {
    mockGit("Preparing worktree (new branch 'feat')\nHEAD is now at abc1234 msg", "", 0);

    await callAndValidate({
      action: "add",
      worktreePath: "../wt",
      branch: "feat",
      createBranch: true,
    });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-b");
    expect(args).toContain("feat");
  });

  // S7: Lock worktree
  it("S7 [P1] lock worktree returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "lock",
      worktreePath: "../wt",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("lock");
  });

  // S8: Unlock worktree
  it("S8 [P1] unlock worktree returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "unlock",
      worktreePath: "../wt",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("unlock");
  });

  // S9: Prune worktrees
  it("S9 [P1] prune worktrees returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({ action: "prune" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("prune");
  });

  // S10: Move worktree
  it("S10 [P1] move worktree returns success with targetPath", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({
      action: "move",
      worktreePath: "../wt",
      newPath: "../wt2",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("move");
    expect(parsed.targetPath).toBe("../wt2");
  });

  // S11: Force remove dirty worktree
  it("S11 [P1] force remove passes --force flag", async () => {
    mockGit("", "", 0);

    await callAndValidate({
      action: "remove",
      worktreePath: "../wt-dirty",
      force: true,
    });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--force");
  });

  // S12: Repair worktrees
  it("S12 [P2] repair worktrees returns success", async () => {
    mockGit("", "", 0);

    const { parsed } = await callAndValidate({ action: "repair" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("repair");
  });

  // S13: Lock with reason
  it("S13 [P2] lock with reason passes --reason flag", async () => {
    mockGit("", "", 0);

    await callAndValidate({
      action: "lock",
      worktreePath: "../wt",
      reason: "in use by CI",
    });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--reason=in use by CI");
  });

  // S14: Verbose list
  it("S14 [P2] listVerbose passes -v flag", async () => {
    mockGit(
      "worktree /home/user/project\nHEAD abc1234567890abcdef1234567890abcdef123456\nbranch refs/heads/main\n\n" +
        "worktree /home/user/project-wt\nHEAD def5678901234567890abcdef1234567890abcdef\nbranch refs/heads/feature\nlocked in use\n\n",
    );

    await callAndValidate({ listVerbose: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-v");
  });

  // S15: Compact vs full output
  it("S15 [P2] compact: false returns full worktree data", async () => {
    mockGit(
      "worktree /home/user/project\nHEAD abc1234567890abcdef1234567890abcdef123456\nbranch refs/heads/main\n\n",
    );

    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.worktrees).toBeDefined();
    expect((parsed.worktrees as Array<Record<string, unknown>>).length).toBe(1);
    const wt = (parsed.worktrees as Array<Record<string, unknown>>)[0];
    expect(wt).toHaveProperty("head");
    expect(wt).toHaveProperty("bare");
  });

  // S16: Schema validation
  it("S16 [P0] schema validates for list and mutate actions", async () => {
    // Test list output
    mockGit(
      "worktree /home/user/project\nHEAD abc1234567890abcdef1234567890abcdef123456\nbranch refs/heads/main\nbare\n\n",
    );

    const { parsed: listParsed } = await callAndValidate({});
    expect(listParsed.worktrees).toBeDefined();
    expect((listParsed.worktrees as unknown[]).length).toBe(1);

    // Test mutate output
    vi.clearAllMocks();
    mockGit("Preparing worktree\nHEAD is now at def5678 msg", "", 0);
    const { parsed: addParsed } = await callAndValidate({
      action: "add",
      worktreePath: "/tmp/wt",
      branch: "dev",
    });
    expect(addParsed.success).toBe(true);
    expect(addParsed.action).toBe("add");
  });
});
